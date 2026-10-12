# shellcheck shell=bash
#
# Publish the checkout as an EAS Update, and boot an EAS Simulator session with
# a development build deep-linked at exactly that update.
#
# Shared by verify-pr.sh and reproduce-issue.sh. Both load the JS under test as
# a published update, not from a dev server, so neither needs Metro or a tunnel.
#
# Requires scripts/agent/lib/sim.sh to be sourced first (EXPO_TOKEN override,
# sim_wait_for_device). Requires PROJECT_ROOT.
#
# Neither function decides what a failure means for the caller's verdict. Each
# returns non-zero and sets SESSION_ERROR to one sentence the caller can report.

UPDATES_URL="https://u.expo.dev/1de013cf-b8b2-4ac3-9e4d-dd70bfd4892e"
APP_SCHEME="pancaketheory"

UPDATE_GROUP_ID="${UPDATE_GROUP_ID:-}"
SESSION_URL=""
SESSION_ERROR=""

# session_publish_update <branch> <message> <log_file>
#
# Publish the checkout to <branch> and set UPDATE_GROUP_ID. iOS only: that is
# the only platform these runs drive.
session_publish_update() {
  local branch="$1" message="$2" log_file="$3" out
  out="$(APP_VARIANT=DEV npx --yes eas-cli@latest update \
    --branch "$branch" \
    --message "$message" \
    --platform ios \
    --environment development \
    --non-interactive --json 2>"$log_file")" || {
    SESSION_ERROR="publishing the checkout as an EAS Update failed, so nothing could run."
    return 1
  }

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

  if [ -z "$UPDATE_GROUP_ID" ]; then
    SESSION_ERROR="publishing the checkout as an EAS Update failed, so nothing could run."
    return 1
  fi
}

# session_start <build_id> <update_group_id> <name>
#
# Boot the session and wait until argent sees a booted device. Sets SIM_UDID,
# AGENT_SIM_UDID, and SESSION_URL (the session page on expo.dev, which keeps the
# session's recording and logs after it stops).
session_start() {
  local build_id="$1" group_id="$2" name="$3"

  # --build-id installs and launches the binary before the session reports
  # ready, and --open-url deep-links it straight at one specific update group.
  # That combination is why this needs no dev server: the JS under test is
  # already published, and this URL is how a development build loads exactly
  # that update instead of whatever its channel would resolve to.
  local target open_url
  target="${UPDATES_URL}/group/${group_id}"
  open_url="${APP_SCHEME}://expo-development-client/?url=$(
    python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$target"
  )"

  echo "session: starting the EAS Simulator session" >&2
  if ! npx --yes eas-cli@latest simulator:start \
      --platform ios --type argent \
      --build-id "$build_id" \
      --open-url "$open_url" \
      --max-duration-minutes "${SESSION_MAX_MINUTES:-30}" \
      --name "$name" \
      --non-interactive --out-config-type dotenv; then
    SESSION_ERROR="the EAS Simulator session did not start."
    return 1
  fi

  echo "session: waiting for the session to report ready" >&2
  local live="" state
  for _ in $(seq 1 64); do
    state="$(npx --yes eas-cli@latest simulator:get --json --non-interactive 2>/dev/null || true)"
    if [ -z "$SESSION_URL" ]; then
      SESSION_URL="$(printf '%s' "$state" | python3 -c '
import json, sys
try:
    print(json.load(sys.stdin).get("deviceRunSessionUrl") or "")
except Exception:
    print("")
' 2>/dev/null || echo "")"
    fi
    if printf '%s' "$state" | grep -q '"status": *"IN_PROGRESS"'; then
      live=1
      break
    fi
    if printf '%s' "$state" | grep -qE '"status": *"(STOPPED|ERRORED)"'; then
      SESSION_ERROR="the simulator session stopped before it was ready."
      return 1
    fi
    sleep 15
  done
  [ -n "$live" ] || { SESSION_ERROR="the simulator session was not ready in time."; return 1; }

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
    SESSION_ERROR="the argent connection config was missing from the session."
    return 1
  fi
  export ARGENT_TOOLS_URL ARGENT_AUTH_TOKEN

  if ! sim_wait_for_device; then
    SESSION_ERROR="argent never saw a booted device in the session."
    return 1
  fi
  export AGENT_SIM_UDID="$SIM_UDID"
}

# session_stop — stop the dotenv session. Idempotent, never fatal. The session
# bills until it is stopped.
session_stop() {
  npx --yes eas-cli@latest simulator:stop --non-interactive >/dev/null 2>&1 || true
}
