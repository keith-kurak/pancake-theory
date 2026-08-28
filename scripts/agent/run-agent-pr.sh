#!/usr/bin/env bash
#
# Agent PR runner — the body of .eas/workflows/agent-pr.yaml.
#
# Given a draft PR that carries a PR-TODO.md task file and the `agent` label:
#
#   0. Preflight   — check secrets, read the task, record the iOS fingerprint.
#   1. Implement   — Claude writes the code, then lint and unit tests run.
#   2. Gate        — recompute the fingerprint; a native change skips phase 3.
#   3. Validate    — publish Metro over a tunnel, start a remote EAS Simulator
#                    session pointed at it, and let Claude drive the real app.
#   4. Publish     — commit, push, rewrite the PR description, and either flip
#                    the PR to ready or leave it in draft with the blockers.
#
# The whole run is capped at AGENT_TOTAL_BUDGET_SECONDS (default 1800). EAS
# Workflows has no job timeout, so the cap is enforced here by run_with_budget.
# Every exit path goes through finish(), so a phase that is killed mid-flight
# still reports and still tears down the simulator.
#
# Local dry run:
#   GH_TOKEN=... GH_REPO=owner/name PR_NUMBER=123 \
#     AGENT_TOTAL_BUDGET_SECONDS=600 ./scripts/agent/run-agent-pr.sh

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

AGENT_STARTED_AT="$(date +%s)"
export AGENT_STARTED_AT

AGENT_OUT="$PROJECT_ROOT/agent-out"
export AGENT_OUT
mkdir -p "$AGENT_OUT"

# shellcheck source=scripts/agent/lib/budget.sh
. "$PROJECT_ROOT/scripts/agent/lib/budget.sh"
# shellcheck source=scripts/agent/lib/gh.sh
. "$PROJECT_ROOT/scripts/agent/lib/gh.sh"
# shellcheck source=scripts/agent/lib/sim.sh
. "$PROJECT_ROOT/scripts/agent/lib/sim.sh"
# shellcheck source=scripts/lib/resolve-sim-build.sh
. "$PROJECT_ROOT/scripts/lib/resolve-sim-build.sh"

: "${IMPLEMENT_BUDGET_SECONDS:=900}"
: "${VALIDATE_BUDGET_SECONDS:=600}"
: "${PUBLISH_RESERVE_SECONDS:=240}"
: "${RUN_URL:=}"

# Phase results, read by finish().
STATUS_IMPLEMENT="not reached"
STATUS_CHECKS="not reached"
STATUS_VALIDATE="not reached"
VERDICT="fail"
BLOCKERS=""

log()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mwarn:\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; }

note_blocker() { BLOCKERS="${BLOCKERS}- $1"$'\n'; }

# ---------------------------------------------------------------------------
# Phase 0 — preflight
# ---------------------------------------------------------------------------

preflight() {
  log "Phase 0: preflight"

  local missing=""
  for var in CLAUDE_CODE_OAUTH_TOKEN GH_TOKEN GH_REPO PR_NUMBER PR_HEAD_REF; do
    [ -n "${!var:-}" ] || missing="$missing $var"
  done
  if [ -n "$missing" ]; then
    fail "missing required variables:$missing"
    fail "see .eas/workflows/README.md for the one-time setup"
    exit 1
  fi

  if [ ! -f "$PROJECT_ROOT/PR-TODO.md" ]; then
    fail "no PR-TODO.md at the repository root"
    gh_comment "$(cat <<'EOF'
The `agent` label is set, but there is no `PR-TODO.md` at the repository root.

Add one describing the feature or fix, push it, then re-apply the label.
Start from `PR-TODO.template.md`.
EOF
)" || warn "could not post the comment"
    exit 1
  fi

  log "Task:"
  sed 's/^/    /' "$PROJECT_ROOT/PR-TODO.md" | head -n 40

  BASELINE_FINGERPRINT="$(ios_fingerprint)"
  log "Baseline iOS fingerprint: ${BASELINE_FINGERPRINT:-<unavailable>}"

  # This repo carries pre-existing lint errors. Blocking on the raw exit code
  # would make every run fail on faults the agent did not cause, so record a
  # baseline and compare against it later.
  lint_counts > "$AGENT_OUT/lint-baseline.txt"
  log "Baseline lint errors: $(awk '{ n += $1 } END { print n + 0 }' "$AGENT_OUT/lint-baseline.txt")"
}

# One line per file+rule, as "<count> <path> <rule>". Counts, not line numbers,
# because the agent's edits shift lines and would otherwise look like new faults.
lint_counts() {
  npx eslint . --format json 2>/dev/null | python3 -c '
import json, os, sys
from collections import Counter
try:
    report = json.load(sys.stdin)
except Exception:
    sys.exit(0)
counts = Counter()
root = os.getcwd()
for entry in report:
    for message in entry.get("messages", []):
        if message.get("severity") == 2:
            path = os.path.relpath(entry["filePath"], root)
            counts[(path, message.get("ruleId") or "unknown")] += 1
for (path, rule), n in sorted(counts.items()):
    print(n, path, rule)
'
}

ios_fingerprint() {
  APP_VARIANT=DEV npx expo-updates fingerprint:generate --platform ios 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("hash",""))' 2>/dev/null \
    || echo ""
}

# ---------------------------------------------------------------------------
# Phase 1 — implement
# ---------------------------------------------------------------------------

# The prompt file is passed to claude as the prompt argument. PR-TODO.md is NOT
# interpolated into the shell or the prompt string — Claude reads it as a file,
# so its contents cannot break out into the command line.
claude_run() {
  local prompt_file="$1"
  shift
  claude --print "$(cat "$prompt_file")" \
    --permission-mode bypassPermissions \
    --output-format stream-json \
    --verbose \
    "$@"
}

implement() {
  log "Phase 1: implement"

  local slice
  slice="$(budget_for "$IMPLEMENT_BUDGET_SECONDS" \
    $(( VALIDATE_BUDGET_SECONDS + PUBLISH_RESERVE_SECONDS )))"

  run_with_budget "$slice" implement \
    claude_run "$PROJECT_ROOT/scripts/agent/prompts/implement.md" \
    > "$AGENT_OUT/implement.jsonl" 2>&1
  local rc=$?

  if [ "$rc" -eq 124 ]; then
    STATUS_IMPLEMENT="timed out after ${slice}s"
    note_blocker "The implement phase ran out of time. Whatever it had written is committed, but it is not finished."
    return 1
  fi
  if [ "$rc" -ne 0 ]; then
    STATUS_IMPLEMENT="failed (exit $rc)"
    note_blocker "The implement phase exited with code $rc. See the run log for details."
    return 1
  fi

  if git diff --quiet && git diff --cached --quiet; then
    STATUS_IMPLEMENT="made no changes"
    note_blocker "The implement phase finished without changing any files. The task in \`PR-TODO.md\` may be unclear."
    return 1
  fi

  STATUS_IMPLEMENT="done"
}

run_checks() {
  log "Phase 1b: lint and unit tests"

  lint_counts > "$AGENT_OUT/lint-after.txt"
  npm run lint > "$AGENT_OUT/lint.log" 2>&1 || true

  local new_lint
  new_lint="$(python3 -c '
import sys
def load(path):
    counts = {}
    with open(path) as handle:
        for line in handle:
            n, path_, rule = line.split(None, 2)
            counts[(path_, rule.strip())] = int(n)
    return counts
before, after = load(sys.argv[1]), load(sys.argv[2])
for key, n in sorted(after.items()):
    extra = n - before.get(key, 0)
    if extra > 0:
        print(f"{extra} x {key[1]} in {key[0]}")
' "$AGENT_OUT/lint-baseline.txt" "$AGENT_OUT/lint-after.txt")"

  local test_rc=0
  npx bun test > "$AGENT_OUT/test.log" 2>&1 || test_rc=$?

  if [ -z "$new_lint" ] && [ "$test_rc" -eq 0 ]; then
    STATUS_CHECKS="no new lint errors, tests pass"
    return 0
  fi

  local parts=""
  if [ -n "$new_lint" ]; then
    parts="new lint errors"
    note_blocker "$(printf 'New lint errors were introduced:\n\n```\n%s\n```\n' "$new_lint")"
  else
    parts="no new lint errors"
  fi
  if [ "$test_rc" -ne 0 ]; then
    parts="$parts, tests exit $test_rc"
    note_blocker "\`npx bun test\` failed. See \`test.log\` in the run artifacts."
  else
    parts="$parts, tests pass"
  fi

  STATUS_CHECKS="$parts"
  return 1
}

# ---------------------------------------------------------------------------
# Phase 2 — fingerprint gate
# ---------------------------------------------------------------------------

# A change to native config makes every existing development build stale. The
# build we can download predates the change, so running against it would prove
# nothing about the new code. Skip validation and say so rather than pretend.
native_changed() {
  log "Phase 2: fingerprint gate"

  local after
  after="$(ios_fingerprint)"
  log "Fingerprint before: ${BASELINE_FINGERPRINT:-<unavailable>}"
  log "Fingerprint after:  ${after:-<unavailable>}"

  if [ -z "$BASELINE_FINGERPRINT" ] || [ -z "$after" ]; then
    warn "could not compute a fingerprint; assuming native config changed"
    return 0
  fi
  [ "$BASELINE_FINGERPRINT" != "$after" ]
}

# ---------------------------------------------------------------------------
# Phase 3 — validate on a simulator
# ---------------------------------------------------------------------------

validate() {
  log "Phase 3: validate on a remote simulator"

  # Fail fast on a missing build. remote-sim.sh would resolve it again anyway,
  # but checking here turns a session-start failure into a clear explanation.
  BUILD_PROFILE=development-simulator
  if ! resolve_build_id >/dev/null; then
    STATUS_VALIDATE="skipped — no usable development-simulator build"
    note_blocker "No unexpired \`development-simulator\` build matches the current runtime, so the change was not exercised on a device. Build one with \`npx eas-cli@latest build --platform ios --profile development-simulator\`."
    return 1
  fi

  # Metro first. The session deep-links the dev build straight at the tunnel URL
  # on launch, so the URL has to exist before the session starts.
  if ! metro_start; then
    STATUS_VALIDATE="skipped — Metro did not start"
    note_blocker "The Metro dev server did not come up on the worker. See \`metro.log\` in the run artifacts."
    return 1
  fi

  if ! sim_start; then
    STATUS_VALIDATE="skipped — the remote simulator session did not start"
    note_blocker "Starting the EAS Simulator session failed, so the change was not exercised on a device. See \`simulator-start.log\` in the run artifacts."
    return 1
  fi

  if ! sim_wait_for_device; then
    STATUS_VALIDATE="skipped — Argent never saw the simulator"
    note_blocker "Argent could not reach the remote simulator, so the app was not driven."
    return 1
  fi

  # Hand Claude an app that is actually on screen. Otherwise it burns its whole
  # slice tapping through system dialogs before it can look at the feature.
  sim_clear_startup_prompts

  # Bundling over a tunnel to a remote device is slower than to a local one, so
  # poll rather than checking once.
  local bundle_waited=0
  until grep -q 'iOS Bundled' "$AGENT_OUT/metro.log"; do
    if [ "$bundle_waited" -ge 180 ]; then
      STATUS_VALIDATE="skipped — the app never loaded from the dev server"
      note_blocker "The development build did not pull a bundle from Metro within 180s, so nothing was verified. See \`metro.log\` in the run artifacts."
      return 1
    fi
    sleep 5
    bundle_waited=$(( bundle_waited + 5 ))
  done
  log "The app loaded a bundle from Metro after ${bundle_waited}s"

  local mcp_config="$AGENT_OUT/argent-mcp.json"
  argent_mcp_config "$mcp_config" >/dev/null

  local slice
  slice="$(budget_for "$VALIDATE_BUDGET_SECONDS" "$PUBLISH_RESERVE_SECONDS")"

  export AGENT_SIM_UDID="$SIM_UDID"
  run_with_budget "$slice" validate \
    claude_run "$PROJECT_ROOT/scripts/agent/prompts/validate.md" \
      --mcp-config "$mcp_config" \
    > "$AGENT_OUT/validate.jsonl" 2>&1
  local rc=$?

  if [ "$rc" -eq 124 ]; then
    STATUS_VALIDATE="timed out after ${slice}s"
    note_blocker "Validation ran out of time before reaching a verdict."
    return 1
  fi

  if [ ! -f "$AGENT_OUT/validation.json" ]; then
    STATUS_VALIDATE="no verdict written"
    note_blocker "Validation finished without writing \`validation.json\`, so the result is unknown."
    return 1
  fi

  local verdict summary
  verdict="$(gh_field verdict < "$AGENT_OUT/validation.json")"
  summary="$(gh_field summary < "$AGENT_OUT/validation.json")"

  if [ "$verdict" = "pass" ]; then
    STATUS_VALIDATE="pass — $summary"
    return 0
  fi

  STATUS_VALIDATE="fail — $summary"
  note_blocker "Simulator validation failed: $summary"
  return 1
}

# ---------------------------------------------------------------------------
# Phase 4 — publish
# ---------------------------------------------------------------------------

commit_and_push() {
  if git diff --quiet && git diff --cached --quiet; then
    log "Nothing to commit"
    return 0
  fi

  log "Phase 4: commit and push to $PR_HEAD_REF"

  git config user.name  "eas-agent[bot]"
  git config user.email "eas-agent[bot]@users.noreply.github.com"

  # agent-out is a run artifact, not source. Keep it out of the commit even if
  # the .gitignore entry is missing on an older branch.
  git add --all -- ':!agent-out'

  git commit --message "$(cat <<EOF
Agent: $(head -n 1 PR-TODO.md | sed 's/^#* *//')

Implemented from PR-TODO.md by the EAS Workflows agent.
Validation: $STATUS_VALIDATE
EOF
)" >/dev/null

  git push "https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git" \
    "HEAD:refs/heads/${PR_HEAD_REF}"
}

results_markdown() {
  local icon
  case "$VERDICT" in
    pass) icon="✅ Ready for review" ;;
    *)    icon="🚧 Still in draft" ;;
  esac

  printf '## %s\n\n' "$icon"
  printf '_Produced by the Agent PR workflow from `PR-TODO.md`. Setup notes: `.eas/workflows/README.md`._\n\n'

  printf '| Phase | Result |\n|---|---|\n'
  printf '| Implement | %s |\n' "$STATUS_IMPLEMENT"
  printf '| Lint and tests | %s |\n' "$STATUS_CHECKS"
  printf '| Simulator validation | %s |\n\n' "$STATUS_VALIDATE"

  if [ -f "$AGENT_OUT/implement-summary.md" ]; then
    printf '### What changed\n\n%s\n\n' "$(cat "$AGENT_OUT/implement-summary.md")"
  fi

  if [ -f "$AGENT_OUT/validation.json" ]; then
    printf '### Validation steps\n\n'
    python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
steps = d.get("steps") or []
if steps:
    print("| Step | Expected | Observed | Result |")
    print("|---|---|---|---|")
    for s in steps:
        cells = [str(s.get(k, "")).replace("|", "\\|").replace("\n", " ")
                 for k in ("step", "expected", "observed", "result")]
        print("| " + " | ".join(cells) + " |")
errors = d.get("runtime_errors") or []
if errors:
    print("\n**Runtime errors**\n")
    for e in errors:
        print(f"- `{e}`")
' "$AGENT_OUT/validation.json" 2>/dev/null || printf '_Could not read the verdict file._\n'
    printf '\n'
  fi

  if [ -n "$BLOCKERS" ]; then
    printf '### Blockers\n\n%s\n' "$BLOCKERS"
  fi

  printf 'Screenshots, Metro logs, and the full transcript are attached to the '
  if [ -n "$RUN_URL" ]; then
    printf '[workflow run](%s).\n' "$RUN_URL"
  else
    printf 'workflow run.\n'
  fi
  printf '\n_Elapsed: %ss of the %ss budget._\n' "$(budget_elapsed)" "$AGENT_TOTAL_BUDGET_SECONDS"
}

publish() {
  local results body merged
  results="$(results_markdown)"

  local pr_json node_id
  pr_json="$(gh_pr_json)" || { fail "could not read the PR"; return 1; }
  body="$(printf '%s' "$pr_json" | gh_field body)"
  node_id="$(printf '%s' "$pr_json" | gh_field node_id)"

  merged="$(gh_merge_results_block "$body" "$results")"
  gh_set_body "$merged" || warn "could not update the PR description"

  if [ "$VERDICT" = "pass" ]; then
    log "Marking PR #$PR_NUMBER ready for review"
    gh_mark_ready "$node_id" || warn "could not clear draft state"
  else
    log "Leaving PR #$PR_NUMBER in draft"
    local blockers="$BLOCKERS"
    [ -n "$blockers" ] || blockers="- No specific blocker was recorded."$'\n'
    gh_comment "$(printf 'The agent run did not reach a passing state, so this PR stays in draft.\n\n%s\nFull results are in the PR description.\n' "$blockers")" \
      || warn "could not post the comment"
  fi
}

finish() {
  local rc=$?
  trap - EXIT

  log "Tearing down"
  sim_teardown

  commit_and_push || warn "could not push to $PR_HEAD_REF"
  publish         || warn "could not publish results"

  log "Done in $(budget_elapsed)s — verdict: $VERDICT"
  [ "$VERDICT" = "pass" ] && exit 0
  exit "$(( rc == 0 ? 1 : rc ))"
}

# ---------------------------------------------------------------------------

main() {
  preflight
  trap finish EXIT INT TERM

  if ! implement; then
    return
  fi

  run_checks || true   # a failing check is a blocker, not a reason to stop

  if native_changed; then
    STATUS_VALIDATE="skipped — the change alters the native fingerprint"
    note_blocker "This change alters the iOS native fingerprint, so no existing development build can run it. Simulator validation was skipped. Build a new \`development-simulator\` build and re-apply the \`agent\` label to validate."
    return
  fi

  if ! validate; then
    return
  fi

  [ -z "$BLOCKERS" ] && VERDICT="pass"
}

main "$@"
