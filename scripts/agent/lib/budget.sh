# shellcheck shell=bash
#
# Wall-clock budgets for the agent job.
#
# EAS Workflows has no job-level timeout key, so every long phase runs under
# run_with_budget: the child goes to the background, a watchdog polls, and the
# child gets TERM then KILL on expiry.
#
# This is a watchdog rather than GNU `timeout` because it signals the child's
# whole process group. claude, expo, and npx all spawn grandchildren that would
# otherwise survive and hold the job open.
#
# Requires AGENT_STARTED_AT to be set once by the caller (epoch seconds).

: "${AGENT_TOTAL_BUDGET_SECONDS:=1800}"

# Seconds since the run began.
budget_elapsed() {
  echo $(( $(date +%s) - AGENT_STARTED_AT ))
}

# Seconds left in the whole run, never negative.
budget_remaining() {
  local left=$(( AGENT_TOTAL_BUDGET_SECONDS - $(budget_elapsed) ))
  [ "$left" -lt 0 ] && left=0
  echo "$left"
}

# budget_for <requested> <reserve>
#
# The largest slice we can give a phase: the smaller of what it asked for and
# what is left after holding back <reserve> seconds for the publish phase.
# Prints 0 when there is nothing to spend, which callers treat as "skip".
budget_for() {
  local requested="$1" reserve="$2"
  local spendable=$(( $(budget_remaining) - reserve ))
  [ "$spendable" -lt 0 ] && spendable=0
  [ "$requested" -lt "$spendable" ] && { echo "$requested"; return; }
  echo "$spendable"
}

# run_with_budget <seconds> <label> <command...>
#
# Returns the child's exit status, or 124 if the budget expired (same code GNU
# timeout uses). Output is not captured — redirect at the call site.
run_with_budget() {
  local limit="$1" label="$2"
  shift 2

  if [ "$limit" -le 0 ]; then
    echo "budget: no time left for '$label', skipping" >&2
    return 124
  fi

  echo "budget: '$label' gets ${limit}s of $(budget_remaining)s remaining" >&2

  # Job control puts the child in its own process group, so the watchdog can
  # signal the whole tree. claude and expo both spawn grandchildren that would
  # otherwise survive and hold the job open.
  local monitor_was_on=0
  case "$-" in *m*) monitor_was_on=1 ;; esac
  set -m

  "$@" &
  local child=$!

  [ "$monitor_was_on" -eq 1 ] || set +m

  local waited=0
  local status=0

  while kill -0 "$child" 2>/dev/null; do
    if [ "$waited" -ge "$limit" ]; then
      echo "budget: '$label' hit its ${limit}s limit, stopping it" >&2
      kill -TERM -"$child" 2>/dev/null || kill -TERM "$child" 2>/dev/null || true
      sleep 5
      kill -KILL -"$child" 2>/dev/null || kill -KILL "$child" 2>/dev/null || true
      wait "$child" 2>/dev/null || true
      return 124
    fi
    sleep 2
    waited=$(( waited + 2 ))
  done

  wait "$child" || status=$?
  return "$status"
}
