#!/usr/bin/env bash
#
# Start (or stop) a remote EAS Simulator session running the latest iOS
# simulator development build, and point the local Argent CLI/MCP at it.
#
#   ./scripts/remote-sim.sh start [--build-id <id>] [--idle <minutes>] [--name <name>]
#   ./scripts/remote-sim.sh stop
#   ./scripts/remote-sim.sh status
#
# "start" does three things:
#   1. Resolves the newest finished, unexpired iOS simulator build from the
#      `development-simulator` EAS Build profile (unless --build-id is given).
#   2. Runs `eas simulator:start --type argent`, which writes ARGENT_TOOLS_URL
#      and ARGENT_AUTH_TOKEN to .env.eas-simulator.
#   3. Runs `argent link` so local argent commands and the argent MCP server
#      talk to the remote simulator instead of a local one.
#
# NOTE: `argent link` is GLOBAL (~/.argent/link.json). While a link is active,
# every argent client on this machine targets the remote session. Run
# `./scripts/remote-sim.sh stop` when you are done.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

EAS="npx eas-cli@latest"
ENV_FILE="$PROJECT_ROOT/.env.eas-simulator"

BUILD_PROFILE="development-simulator"
SESSION_NAME="Pancake Theory sim session"
IDLE_MINUTES="5"
# Empty means "no cap". Unattended callers (the agent workflow) set one so a
# wedged session cannot bill past the run.
MAX_DURATION_MINUTES=""
BUILD_ID=""
OPEN_URL=""
METRO_URL=""

# Dev-client deep link scheme for this app (APP_VARIANT=DEV).
APP_SCHEME="pancaketheory"

# --- helpers ----------------------------------------------------------------

err()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; }
info() { printf '\033[36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }

require() {
  command -v "$1" >/dev/null 2>&1 || { err "'$1' is not on PATH. $2"; exit 1; }
}

# Read one KEY=VALUE from .env.eas-simulator. Strips surrounding quotes.
read_env_var() {
  local key="$1"
  [ -f "$ENV_FILE" ] || return 1
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

usage() {
  cat <<'EOF'
Start (or stop) a remote EAS Simulator session running the latest iOS
simulator development build, and point the local Argent CLI/MCP at it.

Usage:
  ./scripts/remote-sim.sh start [options]
  ./scripts/remote-sim.sh stop
  ./scripts/remote-sim.sh status

Options (start):
  --build-id <id>   Use this EAS Build instead of resolving the latest one.
  --idle <minutes>  Idle timeout before EAS stops the session. Default: 5.
  --max-duration <minutes>
                    Hard cap on session length, whether or not it is idle.
                    Default: no cap.
  --name <name>     Session name shown on expo.dev. Default:
                    "Pancake Theory sim session".
  --profile <name>  EAS Build profile to resolve from. Default:
                    "development-simulator".
  --metro-url <url> Public tunnel URL of a running dev server. The dev build is
                    deep-linked to it on launch, so it connects instead of
                    showing an empty launcher. Start the tunnel first with:
                      EXPO_UNSTABLE_TUNNEL_V2=1 APP_VARIANT=DEV \
                        npx expo start --tunnel
  --open-url <url>  Raw URL to open after launch. Alternative to --metro-url.

"start" does three things:
  1. Resolves the newest finished, unexpired iOS simulator build from the
     build profile (unless --build-id is given).
  2. Runs `eas simulator:start --type argent`, which writes ARGENT_TOOLS_URL
     and ARGENT_AUTH_TOKEN to .env.eas-simulator.
  3. Runs `argent link` so local argent commands and the argent MCP server
     talk to the remote simulator instead of a local one.

NOTE: `argent link` is GLOBAL (~/.argent/link.json). While a link is active,
every argent client on this machine targets the remote session. Run
`./scripts/remote-sim.sh stop` when you are done.
EOF
  exit "${1:-0}"
}

# --- resolve the newest usable simulator development build ------------------

# resolve_build_id lives in a shared file because the EAS Workflows agent job
# (scripts/agent/run-agent-pr.sh) needs the same runtime-match and expiry rules.
# Sourced after info()/err() so it reuses this script's coloured output.
# shellcheck source=scripts/lib/resolve-sim-build.sh
. "$PROJECT_ROOT/scripts/lib/resolve-sim-build.sh"

# --- commands ---------------------------------------------------------------

cmd_start() {
  require npx "Install Node.js."
  require python3 "Install Python 3."
  require argent "Install it with: npm install --global @swmansion/argent"

  if [ -z "$BUILD_ID" ]; then
    BUILD_ID="$(resolve_build_id)"
  else
    info "Using build id supplied on the command line: $BUILD_ID"
  fi

  # A development build launches into the dev-client launcher with no server.
  # --metro-url turns a public tunnel URL into the deep link that connects it.
  if [ -n "$METRO_URL" ]; then
    if [ -n "$OPEN_URL" ]; then
      err "Pass either --metro-url or --open-url, not both."
      exit 1
    fi
    case "$METRO_URL" in
      http://localhost*|http://127.0.0.1*|http://192.168.*|http://10.*)
        err "--metro-url must be publicly reachable. The remote simulator cannot"
        err "see your LAN. Start a tunnel first:"
        err "  EXPO_UNSTABLE_TUNNEL_V2=1 APP_VARIANT=DEV npx expo start --tunnel"
        exit 1
        ;;
    esac
    local encoded
    encoded="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$METRO_URL")"
    OPEN_URL="${APP_SCHEME}://expo-development-client/?url=${encoded}"
    info "Will open: $OPEN_URL"
  fi

  local open_url_args=()
  [ -n "$OPEN_URL" ] && open_url_args=(--open-url "$OPEN_URL")

  local max_duration_args=()
  [ -n "$MAX_DURATION_MINUTES" ] && \
    max_duration_args=(--max-duration-minutes "$MAX_DURATION_MINUTES")

  info "Starting remote EAS Simulator session (argent, idle timeout ${IDLE_MINUTES}m${MAX_DURATION_MINUTES:+, max ${MAX_DURATION_MINUTES}m})..."
  local start_log
  # An explicit template, not `mktemp -t PREFIX`: BSD mktemp appends its own
  # suffix to a bare prefix, but GNU coreutils rejects it with "too few X's in
  # template". This script runs on macOS locally and on a Linux worker in CI.
  start_log="$(mktemp "${TMPDIR:-/tmp}/remote-sim-start.XXXXXX")"
  # Stream the CLI output live and keep a copy so the web preview URL can be
  # repeated in the summary below.
  $EAS simulator:start \
    --platform ios \
    --type argent \
    --name "$SESSION_NAME" \
    --non-interactive \
    --build-id "$BUILD_ID" \
    --max-idle-time-minutes "$IDLE_MINUTES" \
    ${max_duration_args[@]+"${max_duration_args[@]}"} \
    ${open_url_args[@]+"${open_url_args[@]}"} \
    --out-config-type dotenv 2>&1 | tee "$start_log"

  [ -f "$ENV_FILE" ] || { err "$ENV_FILE was not written. The session did not start."; exit 1; }

  local tools_url auth_token
  tools_url="$(read_env_var ARGENT_TOOLS_URL || true)"
  auth_token="$(read_env_var ARGENT_AUTH_TOKEN || true)"

  if [ -z "$tools_url" ]; then
    err "ARGENT_TOOLS_URL is missing from $ENV_FILE."
    err "The session may not be an argent session. Check: $EAS simulator:list"
    exit 1
  fi

  info "Pointing the local argent client at the remote session..."
  if [ -n "$auth_token" ]; then
    argent link "$tools_url" --token "$auth_token" --yes
  else
    argent link "$tools_url" --yes
  fi

  # ARGENT_TOOLS_URL in the shell environment outranks ~/.argent/link.json and
  # would silently send tools somewhere else.
  if [ -n "${ARGENT_TOOLS_URL:-}" ] && [ "${ARGENT_TOOLS_URL}" != "$tools_url" ]; then
    err "WARNING: ARGENT_TOOLS_URL is set in your shell to ${ARGENT_TOOLS_URL}."
    err "That variable overrides the link. Unset it for the link to take effect."
  fi

  local preview_url session_id orphan_id
  preview_url="$(grep -o 'https://web-preview-[^ ]*' "$start_log" | tail -n 1 || true)"
  session_id="$(read_env_var EAS_SIMULATOR_SESSION_ID || true)"
  # Starting a session does NOT stop a previous one; it only stops being tracked
  # in .env.eas-simulator. Left alone it bills until its idle/max timeout.
  orphan_id="$(sed -n 's/.*Overwriting previous simulator session (id: \([0-9a-f-]*\)).*/\1/p' "$start_log" | tail -n 1 || true)"
  rm -f "$start_log"

  ok "Remote simulator session is ready."
  cat <<EOF

  Session name : $SESSION_NAME
  Session id   : ${session_id:-<unknown>}
  Build id     : $BUILD_ID
  Idle timeout : ${IDLE_MINUTES} minutes
  Config       : $ENV_FILE
  Web preview  : ${preview_url:-<see output above>}

  Next steps
  ----------
  1. RESTART your editor / Claude Code session. A running \`argent mcp\` process
     caches its target at startup and keeps using the local simulator until it
     is relaunched.
  2. Verify the link resolves to the remote session:
       argent tools
       $EAS simulator:exec argent run list-devices
  3. Watch session events:
       $EAS simulator:events --follow
  4. When you are done:
       ./scripts/remote-sim.sh stop

EOF

  if [ -n "$orphan_id" ]; then
    err "A previous session ($orphan_id) is still running and is no longer tracked."
    err "It runs until its idle/max timeout. Stop it now with:"
    err "  $EAS simulator:stop --id $orphan_id"
    echo
  fi
}

cmd_stop() {
  require npx "Install Node.js."

  if [ -f "$ENV_FILE" ]; then
    info "Stopping the remote simulator session..."
    $EAS simulator:stop --non-interactive || err "eas simulator:stop failed; continuing with unlink."
  else
    info "No $ENV_FILE found. Nothing to stop on EAS."
  fi

  if command -v argent >/dev/null 2>&1; then
    info "Restoring argent to local simulators..."
    argent unlink --yes || true
  fi

  rm -f "$ENV_FILE"
  ok "Stopped. Restart your editor so argent MCP goes back to local simulators."
}

cmd_status() {
  if [ -f "$ENV_FILE" ]; then
    ok "$ENV_FILE exists:"
    # Print keys only. The file holds a bearer token.
    sed -n 's/^\([A-Z_][A-Z0-9_]*\)=.*/  \1=<set>/p' "$ENV_FILE"
  else
    info "No $ENV_FILE. No local record of a remote session."
  fi

  echo
  if [ -f "$HOME/.argent/link.json" ]; then
    ok "argent is linked to a remote tool-server:"
    python3 -c "
import json
d = json.load(open('$HOME/.argent/link.json'))
print('  url:', d.get('url'))
print('  token:', '<set>' if d.get('token') else '<none>')
print('  created:', d.get('createdAt'))
"
  else
    info "argent is not linked. It will use local simulators."
  fi

  if [ -n "${ARGENT_TOOLS_URL:-}" ]; then
    echo
    err "ARGENT_TOOLS_URL is set in this shell and overrides any link."
  fi

  echo
  info "Remote sessions on EAS:"
  $EAS simulator:list 2>/dev/null || err "Could not list sessions."
}

# --- argument parsing -------------------------------------------------------

[ $# -gt 0 ] || usage 1
COMMAND="$1"; shift

while [ $# -gt 0 ]; do
  case "$1" in
    --build-id)  BUILD_ID="${2:-}"; shift 2 ;;
    --idle)      IDLE_MINUTES="${2:-}"; shift 2 ;;
    --max-duration) MAX_DURATION_MINUTES="${2:-}"; shift 2 ;;
    --name)      SESSION_NAME="${2:-}"; shift 2 ;;
    --profile)   BUILD_PROFILE="${2:-}"; shift 2 ;;
    --metro-url) METRO_URL="${2:-}"; shift 2 ;;
    --open-url)  OPEN_URL="${2:-}"; shift 2 ;;
    -h|--help)  usage 0 ;;
    *)          err "Unknown option: $1"; usage 1 ;;
  esac
done

case "$COMMAND" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  -h|--help|help) usage 0 ;;
  *)      err "Unknown command: $COMMAND"; usage 1 ;;
esac
