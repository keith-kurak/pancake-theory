#!/usr/bin/env bash
#
# Verify a pull request on an EAS cloud simulator and publish the evidence.
#
# The body of the `.eas/functions/agent-verify` custom function, which is called
# by agent-verify.yaml on its own and by agent-start.yaml and agent-revise.yaml
# after a passing agent run.
#
# Publishes the checked-out branch as an EAS Update, boots a runtime-matched
# development build deep-linked at exactly that update, lets an adversarial
# Claude verifier drive the real app and capture screenshots into evidence/,
# deploys those to EAS Hosting, and comments the verdict on the PR.
#
# This is read-only with respect to the branch. It writes no code and pushes no
# commits — it answers "does this PR actually work?" and nothing else. That is
# why it can run against any PR, including ones a human wrote.
#
# No Metro and no tunnel: the JS under test arrives as a published EAS Update,
# not from a dev server.
#
# Required: PR_NUMBER, GH_REPO, GH_TOKEN, EXPO_TOKEN_SIMULATOR,
#           CLAUDE_CODE_OAUTH_TOKEN
# Optional: VERIFY_BUILD_ID   build to use; resolved by runtime when empty
#           UPDATE_GROUP_ID   update to load; published from the checkout when empty
#           VERIFY_SINCE      `/agent` comments newer than this are the focus;
#                             defaults to the branch's last commit time
#           VERIFY_LABEL      label to remove at the end; default agent-verify,
#                             set it empty to remove none
#           VERIFY_GATE_READY true to let the verdict set draft state
#           PR_HEAD_REF       the branch; looked up from the PR when unset
#
# Local dry run:
#   GH_TOKEN=... GH_REPO=owner/name PR_NUMBER=123 EXPO_TOKEN_SIMULATOR=... \
#     CLAUDE_CODE_OAUTH_TOKEN=... VERIFY_LABEL= ./scripts/agent/verify-pr.sh

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# shellcheck source=scripts/agent/lib/gh.sh
. "$PROJECT_ROOT/scripts/agent/lib/gh.sh"
# shellcheck source=scripts/agent/lib/sim.sh
. "$PROJECT_ROOT/scripts/agent/lib/sim.sh"
# shellcheck source=scripts/agent/lib/evidence.sh
. "$PROJECT_ROOT/scripts/agent/lib/evidence.sh"
# shellcheck source=scripts/lib/resolve-sim-build.sh
. "$PROJECT_ROOT/scripts/lib/resolve-sim-build.sh"

EVIDENCE_DIR="$PROJECT_ROOT/evidence"
VERDICT_FILE="$PROJECT_ROOT/evidence/verdict.md"
# `-`, not `:-`: the agent workflows pass an empty label on purpose, because
# there is no verify label to remove when the run was chained.
VERIFY_LABEL="${VERIFY_LABEL-agent-verify}"
: "${VERIFY_MARKER:=/agent}"
: "${VERIFY_BUILD_ID:=${BUILD_ID:-}}"
: "${UPDATE_GROUP_ID:=}"
: "${VERIFY_SINCE:=}"
: "${VERIFY_GATE_READY:=false}"
: "${CLAUDE_TIMEOUT:=20m}"
: "${SESSION_MAX_MINUTES:=30}"
: "${RUN_URL:=}"

UPDATES_URL="https://u.expo.dev/1de013cf-b8b2-4ac3-9e4d-dd70bfd4892e"
APP_SCHEME="pancaketheory"

COMMENT_POSTED=""
GATE_APPLIED=""
GATE_LINE=""

log()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mwarn:\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; }

gate_enabled() { [ "$VERIFY_GATE_READY" = "true" ]; }

# inconclusive <reason> — record a verdict for a run that could not test at all.
# An infrastructure failure is not evidence against the PR, so it is never FAIL,
# and it is never PASS either.
inconclusive() {
  printf 'INCONCLUSIVE: %s\n' "$1" > "$VERDICT_FILE"
  fail "$1"
}

# ---------------------------------------------------------------------------
# Draft gate
# ---------------------------------------------------------------------------

# apply_gate <verdict_line>
#
# Only for chained runs. The agent job left draft state alone so that this
# verdict decides it once: PASS marks the PR ready, and anything else keeps or
# moves it to draft. "Ready for review" then always means "independently
# verified". Sets GATE_LINE for the PR comment. Called directly, never in $(...),
# so GATE_APPLIED survives and the state is changed only once.
apply_gate() {
  gate_enabled || return 0
  [ -z "$GATE_APPLIED" ] || return 0
  GATE_APPLIED=1

  local pr_json node_id is_draft
  pr_json="$(gh_pr_json)" || { warn "could not read the PR to set draft state"; return 0; }
  node_id="$(printf '%s' "$pr_json" | gh_field node_id)"
  is_draft="$(printf '%s' "$pr_json" | gh_field draft)"

  case "$1" in
    PASS*)
      if [ "$is_draft" != "true" ]; then
        GATE_LINE="✅ Stays open for review."
      elif gh_mark_ready "$node_id"; then
        GATE_LINE="✅ Marked ready for review."
      else
        warn "could not clear draft state"
        GATE_LINE="⚠️ Passed, but the PR could not be marked ready."
      fi
      ;;
    *)
      if [ "$is_draft" = "true" ]; then
        GATE_LINE="🚧 Stays in draft. To fix the findings, comment \`/agent <what to change>\` and add the \`agent-revise\` label."
      elif gh_convert_to_draft "$node_id"; then
        GATE_LINE="🚧 Moved back to draft: an unverified PR is not ready for review."
      else
        warn "could not set draft state"
        GATE_LINE="⚠️ Not verified, and the PR could not be moved back to draft."
      fi
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------

# The session bills until stopped, and a run that dies before commenting would
# leave the PR silent. This covers both, and it tells the truth: a verdict that
# was reached is reported even when a later step (deploy, comment) failed.
cleanup() {
  local code=$?
  trap - EXIT

  npx --yes eas-cli@latest simulator:stop --non-interactive >/dev/null 2>&1 || true

  if [ "$code" -ne 0 ] && [ -z "$COMMENT_POSTED" ]; then
    local line
    line="$(head -n 1 "$VERDICT_FILE" 2>/dev/null || echo "")"
    apply_gate "${line:-INCONCLUSIVE}"
    if [ -n "$line" ]; then
      gh_comment "$(printf '## Independent verification\n\n**Verdict:** %s\n\n%s\n\n⚠️ A later step failed after the verdict was reached. Full logs are on the %s.\n' \
        "$line" "$GATE_LINE" "${RUN_URL:+[workflow run]($RUN_URL)}")" || true
    else
      gh_comment "$(printf '## Independent verification\n\n⚠️ **Verification errored before reaching a verdict.** Logs are on the %s.\n\n%s\n' \
        "${RUN_URL:-workflow run}" "$GATE_LINE")" || true
    fi
  fi

  if [ -n "$VERIFY_LABEL" ]; then
    gh_remove_label "$VERIFY_LABEL"
  fi
  exit "$code"
}

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

missing=""
for var in PR_NUMBER GH_REPO GH_TOKEN EXPO_TOKEN_SIMULATOR CLAUDE_CODE_OAUTH_TOKEN; do
  [ -n "${!var:-}" ] || missing="$missing $var"
done
if [ -n "$missing" ]; then
  fail "missing required variables:$missing"
  fail "see .eas/workflows/SETUP.md for the one-time setup"
  exit 1
fi

trap cleanup EXIT INT TERM

rm -rf "$EVIDENCE_DIR"
mkdir -p "$EVIDENCE_DIR"
# upload_artifact errors with "no paths specified to add to archive" when
# nothing matches its globs, which turns one failure into two and loses the
# logs. Guarantee a match from the very first line.
printf 'Verification run for PR #%s\n' "${PR_NUMBER:-?}" > "$EVIDENCE_DIR/run.txt"

log "Verifying PR #$PR_NUMBER"
PR_JSON="$(gh_pr_json)" || { fail "could not read PR #$PR_NUMBER"; exit 1; }
PR_TITLE="$(printf '%s' "$PR_JSON" | gh_field title)"
if [ -z "${PR_HEAD_REF:-}" ]; then
  PR_HEAD_REF="$(printf '%s' "$PR_JSON" | gh_field head.ref)"
fi
log "  title:  $PR_TITLE"
log "  branch: $PR_HEAD_REF"
log "  commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

# ---------------------------------------------------------------------------
# Gather intent and claims, as separate files
# ---------------------------------------------------------------------------

# The verifier is told to plan from the intent before it reads any claim. So
# what the change was *for* (the task, the reviewer's requests) and what its
# author *says* it does (the PR description, with the agent's results block)
# are kept apart. All of it is user-written and reaches Claude only as files.
if [ -f "$PROJECT_ROOT/PR-TODO.md" ]; then
  cp "$PROJECT_ROOT/PR-TODO.md" "$EVIDENCE_DIR/task.md"
fi
printf '%s\n' "$(printf '%s' "$PR_JSON" | gh_field body)" > "$EVIDENCE_DIR/pr-body.md"

[ -n "$VERIFY_SINCE" ] || VERIFY_SINCE="$(git log -1 --format=%cI 2>/dev/null || echo "")"
gh_collect_requests "$VERIFY_SINCE" "$VERIFY_MARKER" > "$EVIDENCE_DIR/requests.md" 2>/dev/null \
  || : > "$EVIDENCE_DIR/requests.md"
if [ -s "$EVIDENCE_DIR/requests.md" ]; then
  log "  requests since ${VERIFY_SINCE:-<all time>}:"
  sed 's/^/    /' "$EVIDENCE_DIR/requests.md" | head -n 20
fi

# The diff is context for the verifier: it should test what changed, not the
# whole app. Capped so a large PR cannot blow the prompt budget.
gh_pr_diff > "$EVIDENCE_DIR/pr.diff" 2>/dev/null || : > "$EVIDENCE_DIR/pr.diff"
if [ "$(wc -c < "$EVIDENCE_DIR/pr.diff")" -gt 150000 ]; then
  head -c 150000 "$EVIDENCE_DIR/pr.diff" > "$EVIDENCE_DIR/pr.diff.capped"
  printf '\n\n[diff truncated at 150 kB]\n' >> "$EVIDENCE_DIR/pr.diff.capped"
  mv "$EVIDENCE_DIR/pr.diff.capped" "$EVIDENCE_DIR/pr.diff"
fi

# ---------------------------------------------------------------------------
# Resolve the binary and publish the JS
# ---------------------------------------------------------------------------

# publish_update — publish the checkout to a branch named after the PR branch,
# and set UPDATE_GROUP_ID. iOS only: that is the only platform verified.
publish_update() {
  log "Publishing this checkout as an EAS Update on branch '$PR_HEAD_REF'"
  local out
  out="$(APP_VARIANT=DEV npx --yes eas-cli@latest update \
    --branch "$PR_HEAD_REF" \
    --message "Verify PR #$PR_NUMBER" \
    --platform ios \
    --environment development \
    --non-interactive --json 2>"$EVIDENCE_DIR/update.log")" || return 1

  UPDATE_GROUP_ID="$(printf '%s' "$out" | python3 -c '
import json, sys
raw = sys.stdin.read()
start = raw.find("[")
try:
    groups = json.loads(raw[start:]) if start >= 0 else []
except Exception:
    groups = []
print(next((g.get("group") for g in groups if g.get("group")), ""))
' 2>/dev/null || echo "")"
  [ -n "$UPDATE_GROUP_ID" ]
}

resolve_inputs() {
  if [ -z "$VERIFY_BUILD_ID" ]; then
    # The same resolver the agent's validate phase uses, so a chained verify
    # runs on the binary the agent validated against.
    BUILD_PROFILE=development-simulator
    VERIFY_BUILD_ID="$(resolve_build_id 2>>"$EVIDENCE_DIR/build-resolve.log")" || VERIFY_BUILD_ID=""
    if [ -z "$VERIFY_BUILD_ID" ]; then
      inconclusive "no unexpired development-simulator build matches this runtime, so nothing could run."
      return 1
    fi
  fi

  if [ -z "$UPDATE_GROUP_ID" ] && ! publish_update; then
    tail -n 15 "$EVIDENCE_DIR/update.log" >&2 2>/dev/null
    inconclusive "publishing this branch as an EAS Update failed, so nothing could run."
    return 1
  fi

  log "  build:  $VERIFY_BUILD_ID"
  log "  update: $UPDATE_GROUP_ID"
}

# ---------------------------------------------------------------------------
# Boot the session, already pointed at this PR's update
# ---------------------------------------------------------------------------

start_session() {
  # --build-id installs and launches the binary before the session reports
  # ready, and --open-url deep-links it straight at one specific update group.
  # That combination is why this needs no dev server: the PR's JS is already
  # published, and this URL is how a development build loads exactly that
  # update instead of whatever its channel would resolve to.
  local target open_url session_name
  target="${UPDATES_URL}/group/${UPDATE_GROUP_ID}"
  open_url="${APP_SCHEME}://expo-development-client/?url=$(
    python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$target"
  )"
  session_name="$(printf 'PR #%s verify: %s' "$PR_NUMBER" "$PR_TITLE" | cut -c1-50)"

  log "Starting the EAS Simulator session"
  if ! npx --yes eas-cli@latest simulator:start \
      --platform ios --type argent \
      --build-id "$VERIFY_BUILD_ID" \
      --open-url "$open_url" \
      --max-duration-minutes "$SESSION_MAX_MINUTES" \
      --name "$session_name" \
      --non-interactive --out-config-type dotenv; then
    inconclusive "the EAS Simulator session did not start."
    return 1
  fi

  log "Waiting for the session to report ready"
  local live="" state
  for _ in $(seq 1 64); do
    state="$(npx --yes eas-cli@latest simulator:get --json --non-interactive 2>/dev/null || true)"
    if printf '%s' "$state" | grep -q '"status": *"IN_PROGRESS"'; then
      live=1
      break
    fi
    if printf '%s' "$state" | grep -qE '"status": *"(STOPPED|ERRORED)"'; then
      inconclusive "the simulator session stopped before it was ready."
      return 1
    fi
    sleep 15
  done
  [ -n "$live" ] || { inconclusive "the simulator session was not ready in time."; return 1; }

  # An argent session writes its connection config to .env.eas-simulator.
  # Exporting these routes every argent client in this process tree — CLI and
  # MCP server alike — at the remote tool-server. Deliberately not `argent
  # link`: that writes to ~/.argent/link.json, which is global to the machine.
  if [ -f "$PROJECT_ROOT/.env.eas-simulator" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$PROJECT_ROOT/.env.eas-simulator"
    set +a
  fi
  if [ -z "${ARGENT_TOOLS_URL:-}" ] || [ -z "${ARGENT_AUTH_TOKEN:-}" ]; then
    inconclusive "the argent connection config was missing from the session."
    return 1
  fi
  export ARGENT_TOOLS_URL ARGENT_AUTH_TOKEN

  if ! sim_wait_for_device; then
    inconclusive "argent never saw a booted device in the session."
    return 1
  fi
  export AGENT_SIM_UDID="$SIM_UDID"
}

# ---------------------------------------------------------------------------
# Run the verifier
# ---------------------------------------------------------------------------

run_verifier() {
  # Dismiss the dev-client explainer and any scheme confirmation, by label from
  # the accessibility tree. Without this the verifier spends its budget tapping
  # through dialogs before it can see the feature.
  sim_clear_startup_prompts 60

  # A deterministic floor beneath the AI verifier: the app rendered something
  # at all. If this is empty, no verdict from Claude would be worth reading.
  log "Snapshotting the launch state"
  local snapshot
  snapshot="$(npx --yes @swmansion/argent@latest run describe --udid "$SIM_UDID" 2>/dev/null || true)"
  printf '%s\n' "$snapshot" > "$EVIDENCE_DIR/launch-snapshot.txt"
  if [ -z "$snapshot" ] || ! printf '%s' "$snapshot" | grep -q 'ROOT'; then
    printf 'FAIL: the app produced no UI after launch — the update may not have loaded.\n' > "$VERDICT_FILE"
    fail "empty UI snapshot after launch"
    return 0
  fi

  local prompt="$EVIDENCE_DIR/verify-prompt.md"
  cp "$PROJECT_ROOT/scripts/agent/prompts/verify.md" "$prompt"
  {
    printf '\n---\n\n## This run\n\n'
    printf -- '- The PR under test is #%s: "%s".\n' "$PR_NUMBER" "$PR_TITLE"
    printf -- '- Pass `udid: %s` to every argent tool.\n' "$SIM_UDID"
    if gate_enabled; then
      printf -- '- An agent wrote this change and has already judged its own work as passing. Your verdict alone decides whether the PR is marked ready for review. Look for what the author missed.\n'
    fi
    printf '\nIntent — what the change is for. Read these first:\n\n'
    [ -f "$EVIDENCE_DIR/task.md" ] && printf -- '- `evidence/task.md` — the original task.\n'
    if [ -s "$EVIDENCE_DIR/requests.md" ]; then
      printf -- '- `evidence/requests.md` — the reviewer'"'"'s `/agent` comments for this round. They outrank your own reading of the diff.\n'
    fi
    printf -- '- The PR title, above.\n'
    printf '\nThe change itself:\n\n- `evidence/pr.diff`\n'
    printf '\nClaims — what the author says the change does. Read only after you have written your test plan:\n\n'
    printf -- '- `evidence/pr-body.md` — the PR description, including any agent results block.\n'
  } >> "$prompt"

  local mcp_config="$EVIDENCE_DIR/argent-mcp.json"
  argent_mcp_config "$mcp_config" >/dev/null

  log "Running the verifier (timeout $CLAUDE_TIMEOUT)"
  # The verdict file is the contract, not Claude's exit code. timeout is the
  # hard backstop: a hung agent is killed, leaves no verdict, and the run fails
  # closed rather than reporting a pass nobody proved.
  timeout "$CLAUDE_TIMEOUT" claude \
    --print "$(cat "$prompt")" \
    --permission-mode bypassPermissions \
    --mcp-config "$mcp_config" \
    --output-format stream-json --verbose \
    > "$EVIDENCE_DIR/verifier.jsonl" 2>&1 || true

  if [ ! -s "$VERDICT_FILE" ]; then
    printf 'FAIL: the verifier produced no verdict (agent error, timeout, or runaway).\n' > "$VERDICT_FILE"
  fi
}

if resolve_inputs && start_session; then
  run_verifier
fi

VERDICT_LINE="$(head -n 1 "$VERDICT_FILE")"
log "Verdict: $VERDICT_LINE"

# Stop as soon as the verdict is in. The session bills until then.
npx --yes eas-cli@latest simulator:stop --non-interactive >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# Publish the evidence
# ---------------------------------------------------------------------------

log "Publishing the evidence site"
EVIDENCE_URL="$(publish_evidence "$EVIDENCE_DIR" "PR #${PR_NUMBER}" "$VERDICT_LINE" "pr-${PR_NUMBER}-verify")"
if [ -n "$EVIDENCE_URL" ]; then
  log "Evidence: $EVIDENCE_URL"
else
  warn "the evidence site did not publish; the comment will omit the link"
fi

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

apply_gate "$VERDICT_LINE"
REPORT="$(tail -n +2 "$VERDICT_FILE")"
[ -n "$REPORT" ] || REPORT="_No report. The run could not reach the app._"

# Built before the heredoc, not inside it. bash 3.2 — still the system bash on
# macOS — mis-parses a command substitution nested in a heredoc that is itself
# inside a command substitution, and then chokes on the next apostrophe. bash 5
# on the Linux worker handles it, so this only broke local runs.
EVIDENCE_LINE=""
if [ -n "$EVIDENCE_URL" ]; then
  EVIDENCE_LINE="$(printf '\n🖼️ **[Evidence](%s)** — screenshots from the run\n' "$EVIDENCE_URL")"
fi
UPDATE_NOTE="${UPDATE_GROUP_ID:+ · JS from update group \`${UPDATE_GROUP_ID}\`}"

gh_comment "$(cat <<EOF
## Independent verification

**Verdict:** ${VERDICT_LINE}
${EVIDENCE_LINE}
${GATE_LINE}

<details>
<summary>Full report</summary>

${REPORT}

</details>

_EAS cloud simulator · build \`${VERIFY_BUILD_ID:-none}\`${UPDATE_NOTE} · commit \`$(git rev-parse --short HEAD 2>/dev/null || echo '?')\`_
EOF
)" && COMMENT_POSTED=1 || warn "could not post the comment"

if command -v set-output >/dev/null 2>&1; then
  set-output evidence_url "$EVIDENCE_URL"
  set-output verdict "$VERDICT_LINE"
fi

# A failing verdict fails the job, so the check is red on the PR.
case "$VERDICT_LINE" in
  PASS*) exit 0 ;;
  *)     exit 1 ;;
esac
