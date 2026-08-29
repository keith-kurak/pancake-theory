#!/usr/bin/env bash
#
# Verify a pull request on an EAS cloud simulator and publish the evidence.
#
# Boots a fingerprint-matched development build, deep-links it at this PR's
# freshly published update, lets Claude drive the real app and capture
# screenshots into evidence/, deploys those to EAS Hosting, and comments the
# verdict on the PR.
#
# This is read-only with respect to the branch. It writes no code and pushes no
# commits — it answers "does this PR actually work?" and nothing else. That is
# why it can run against any PR, including ones a human wrote.
#
# No Metro and no tunnel: the JS under test arrives as a published EAS Update,
# not from a dev server.
#
# Required: BUILD_ID, UPDATE_GROUP_ID, PR_NUMBER, GH_REPO, GH_TOKEN,
#           EXPO_TOKEN, CLAUDE_CODE_OAUTH_TOKEN
# Optional: VERIFY_INSTRUCTION (guidance from the /verify comment; looked up
#           from the PR when unset)

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# shellcheck source=scripts/agent/lib/gh.sh
. "$PROJECT_ROOT/scripts/agent/lib/gh.sh"
# shellcheck source=scripts/agent/lib/sim.sh
. "$PROJECT_ROOT/scripts/agent/lib/sim.sh"

EVIDENCE_DIR="$PROJECT_ROOT/evidence"
VERDICT_FILE="$PROJECT_ROOT/evidence/verdict.md"
: "${VERIFY_LABEL:=agent-verify}"
: "${VERIFY_MARKER:=/verify}"
: "${CLAUDE_TIMEOUT:=20m}"
: "${SESSION_MAX_MINUTES:=30}"
: "${RUN_URL:=}"

UPDATES_URL="https://u.expo.dev/1de013cf-b8b2-4ac3-9e4d-dd70bfd4892e"
APP_SCHEME="pancaketheory"

COMMENT_POSTED=""

log()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mwarn:\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; }

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
    if [ -s "$VERDICT_FILE" ]; then
      gh_comment "$(printf '## 🤖 PR verification\n\n**Verdict:** %s\n\n⚠️ A later step failed after the verdict was reached. Full logs are on the %s.\n' \
        "$(head -n 1 "$VERDICT_FILE")" "${RUN_URL:+[workflow run]($RUN_URL)}")" || true
    else
      gh_comment "$(printf '## 🤖 PR verification\n\n⚠️ **Verification errored before reaching a verdict.** Logs are on the %s.\n' \
        "${RUN_URL:-workflow run}")" || true
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
for var in BUILD_ID UPDATE_GROUP_ID PR_NUMBER GH_REPO GH_TOKEN EXPO_TOKEN CLAUDE_CODE_OAUTH_TOKEN; do
  [ -n "${!var:-}" ] || missing="$missing $var"
done
if [ -n "$missing" ]; then
  fail "missing required variables:$missing"
  fail "see .eas/workflows/README.md for the one-time setup"
  exit 1
fi

trap cleanup EXIT INT TERM

rm -rf "$EVIDENCE_DIR"
mkdir -p "$EVIDENCE_DIR"

log "Verifying PR #$PR_NUMBER"
PR_JSON="$(gh_pr_json)" || { fail "could not read PR #$PR_NUMBER"; exit 1; }
PR_TITLE="$(printf '%s' "$PR_JSON" | gh_field title)"
log "  title:  $PR_TITLE"
log "  build:  $BUILD_ID"
log "  update: $UPDATE_GROUP_ID"

# The diff is context for the verifier: it should test what changed, not the
# whole app. Capped so a large PR cannot blow the prompt budget.
gh_pr_diff > "$EVIDENCE_DIR/pr.diff" 2>/dev/null || : > "$EVIDENCE_DIR/pr.diff"
if [ "$(wc -c < "$EVIDENCE_DIR/pr.diff")" -gt 150000 ]; then
  head -c 150000 "$EVIDENCE_DIR/pr.diff" > "$EVIDENCE_DIR/pr.diff.capped"
  printf '\n\n[diff truncated at 150 kB]\n' >> "$EVIDENCE_DIR/pr.diff.capped"
  mv "$EVIDENCE_DIR/pr.diff.capped" "$EVIDENCE_DIR/pr.diff"
fi

if [ -z "${VERIFY_INSTRUCTION:-}" ]; then
  VERIFY_INSTRUCTION="$(gh_latest_request "$VERIFY_MARKER" || echo "")"
fi
[ -n "$VERIFY_INSTRUCTION" ] && log "  guidance: $VERIFY_INSTRUCTION"

# ---------------------------------------------------------------------------
# Boot the session, already pointed at this PR's update
# ---------------------------------------------------------------------------

# --build-id installs and launches the binary before the session reports ready,
# and --open-url deep-links it straight at one specific update group. That
# combination is why this needs no dev server: the PR's JS is already published,
# and this URL is how a development build loads exactly that update instead of
# whatever its channel would resolve to.
DEEP_LINK_TARGET="${UPDATES_URL}/group/${UPDATE_GROUP_ID}"
OPEN_URL="${APP_SCHEME}://expo-development-client/?url=$(
  python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$DEEP_LINK_TARGET"
)"

SESSION_NAME="$(printf 'PR #%s verify: %s' "$PR_NUMBER" "$PR_TITLE" | cut -c1-50)"

log "Starting the EAS Simulator session"
if ! npx --yes eas-cli@latest simulator:start \
    --platform ios --type argent \
    --build-id "$BUILD_ID" \
    --open-url "$OPEN_URL" \
    --max-duration-minutes "$SESSION_MAX_MINUTES" \
    --name "$SESSION_NAME" \
    --non-interactive --out-config-type dotenv; then
  fail "simulator:start failed"
  exit 1
fi

log "Waiting for the session to report ready"
LIVE=""
for _ in $(seq 1 64); do
  STATE="$(npx --yes eas-cli@latest simulator:get --json --non-interactive 2>/dev/null || true)"
  if printf '%s' "$STATE" | grep -q '"status": *"IN_PROGRESS"'; then
    LIVE=1
    break
  fi
  if printf '%s' "$STATE" | grep -qE '"status": *"(STOPPED|ERRORED)"'; then
    fail "the simulator session stopped before it was ready"
    exit 1
  fi
  sleep 15
done
[ -n "$LIVE" ] || { fail "the session was not ready in time"; exit 1; }

# An argent session writes its connection config to .env.eas-simulator.
# Exporting these routes every argent client in this process tree — CLI and MCP
# server alike — at the remote tool-server. Deliberately not `argent link`:
# that writes to ~/.argent/link.json, which is global to the machine.
if [ -f "$PROJECT_ROOT/.env.eas-simulator" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_ROOT/.env.eas-simulator"
  set +a
fi
if [ -z "${ARGENT_TOOLS_URL:-}" ] || [ -z "${ARGENT_AUTH_TOKEN:-}" ]; then
  fail "argent connection config missing from .env.eas-simulator"
  exit 1
fi
export ARGENT_TOOLS_URL ARGENT_AUTH_TOKEN

if ! sim_wait_for_device; then
  fail "argent never saw a booted device in the session"
  exit 1
fi
export AGENT_SIM_UDID="$SIM_UDID"

# ---------------------------------------------------------------------------
# Get to the app under test
# ---------------------------------------------------------------------------

# Dismiss the dev-client explainer and any scheme confirmation, by label from
# the accessibility tree. Without this the verifier spends its budget tapping
# through dialogs before it can see the feature.
sim_clear_startup_prompts 60

# A deterministic floor beneath the AI verifier: the app rendered something at
# all. If this is empty, no verdict from Claude would be worth reading.
log "Snapshotting the launch state"
SNAPSHOT="$(npx --yes @swmansion/argent@latest run describe --udid "$SIM_UDID" 2>/dev/null || true)"
printf '%s\n' "$SNAPSHOT" > "$EVIDENCE_DIR/launch-snapshot.txt"
if [ -z "$SNAPSHOT" ] || ! printf '%s' "$SNAPSHOT" | grep -q 'ROOT'; then
  printf 'FAIL: the app produced no UI after launch — the update may not have loaded.\n' > "$VERDICT_FILE"
  fail "empty UI snapshot after launch"
else
  # ---------------------------------------------------------------------------
  # Run the verifier
  # ---------------------------------------------------------------------------

  PROMPT="$EVIDENCE_DIR/verify-prompt.md"
  cp "$PROJECT_ROOT/scripts/agent/prompts/verify.md" "$PROMPT"
  {
    printf '\n---\n\n'
    printf 'The PR under test is #%s: "%s".\n' "$PR_NUMBER" "$PR_TITLE"
    printf 'Pass `udid: %s` to every argent tool.\n' "$SIM_UDID"
    printf 'The PR diff is at `evidence/pr.diff`.\n'
    if [ -n "$VERIFY_INSTRUCTION" ]; then
      printf '\nThe reviewer asked for this specifically: %s\n' "$VERIFY_INSTRUCTION"
    fi
  } >> "$PROMPT"

  MCP_CONFIG="$EVIDENCE_DIR/argent-mcp.json"
  argent_mcp_config "$MCP_CONFIG" >/dev/null

  log "Running the verifier (timeout $CLAUDE_TIMEOUT)"
  # The verdict file is the contract, not Claude's exit code. timeout is the
  # hard backstop: a hung agent is killed, leaves no verdict, and the run fails
  # closed rather than reporting a pass nobody proved.
  timeout "$CLAUDE_TIMEOUT" npx --yes @anthropic-ai/claude-code@latest \
    --print "$(cat "$PROMPT")" \
    --permission-mode bypassPermissions \
    --mcp-config "$MCP_CONFIG" \
    --output-format stream-json --verbose \
    > "$EVIDENCE_DIR/verifier.jsonl" 2>&1 || true

  if [ ! -s "$VERDICT_FILE" ]; then
    printf 'FAIL: the verifier produced no verdict (agent error, timeout, or runaway).\n' > "$VERDICT_FILE"
  fi
fi

VERDICT_LINE="$(head -n 1 "$VERDICT_FILE")"
log "Verdict: $VERDICT_LINE"

# Stop as soon as the verdict is in. The session bills until then.
npx --yes eas-cli@latest simulator:stop --non-interactive >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# Publish the evidence
# ---------------------------------------------------------------------------

log "Building the evidence site"
node scripts/agent/build-evidence-site.mjs "$EVIDENCE_DIR" "PR #${PR_NUMBER}" "$VERDICT_LINE"

# eas deploy joins --export-dir onto the project directory, so an absolute path
# gets doubled and reported as "not found". It must be relative to the root.
log "Deploying the evidence site"
DEPLOY_JSON="$(npx --yes eas-cli@latest deploy \
  --export-dir "evidence/site" \
  --alias "pr-${PR_NUMBER}-verify" \
  --non-interactive --json 2>/dev/null || echo "")"

EVIDENCE_URL="$(printf '%s' "$DEPLOY_JSON" | python3 -c '
import json, sys
raw = sys.stdin.read()
start = raw.find("{")
if start < 0:
    print(""); raise SystemExit
try:
    d = json.loads(raw[start:])
except Exception:
    print(""); raise SystemExit
aliases = d.get("aliases") or []
print((aliases[0].get("url") if aliases else None) or d.get("url") or "")
' 2>/dev/null || echo "")"

if [ -n "$EVIDENCE_URL" ]; then
  log "Evidence: $EVIDENCE_URL"
else
  warn "the evidence site did not deploy; the comment will omit the link"
fi

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

REPORT="$(tail -n +2 "$VERDICT_FILE")"
gh_comment "$(cat <<EOF
## 🤖 PR verification

**Verdict:** ${VERDICT_LINE}
$([ -n "$EVIDENCE_URL" ] && printf '\n🖼️ [Evidence](%s) — screenshots from the run\n' "$EVIDENCE_URL")
<details>
<summary>Full report</summary>

${REPORT}

</details>

_EAS cloud simulator · build \`${BUILD_ID}\` · this PR's JS as update group \`${UPDATE_GROUP_ID}\`_
EOF
)" && COMMENT_POSTED=1 || warn "could not post the comment"

set-output evidence_url "$EVIDENCE_URL" 2>/dev/null || true
set-output verdict "$VERDICT_LINE" 2>/dev/null || true

# A failing verdict fails the job, so the check is red on the PR.
case "$VERDICT_LINE" in
  PASS*) exit 0 ;;
  *)     exit 1 ;;
esac
