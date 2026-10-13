#!/usr/bin/env bash
#
# Start (or stop) a remote EAS Simulator session running the latest Android
# emulator development build, and point the local agent-device CLI/MCP at it.
#
#   ./scripts/remote-sim-android.sh start [--build-id <id>] [--idle <minutes>] [--name <name>]
#   ./scripts/remote-sim-android.sh stop
#   ./scripts/remote-sim-android.sh status
#
# This is the Android counterpart of scripts/remote-sim.sh. The two share the
# same EAS session tracking file (.env.eas-simulator) and the same global agent-device
# link, so only one remote session — iOS or Android — is active at a time.
# Starting one after the other stops tracking the first; stop it from expo.dev if
# you started it in another shell.
#
# "start" does three things:
#   1. Resolves the newest finished, unexpired Android development build from the
#      `development` EAS Build profile (unless --build-id is given). An
#      internal-distribution APK from that profile installs on an emulator as-is.
#   2. Runs `eas simulator:start --platform android --type agent-device`, which
#      writes AGENT_DEVICE_DAEMON_BASE_URL and AGENT_DEVICE_DAEMON_AUTH_TOKEN
#      to .env.eas-simulator.
#   3. Runs `agent-device connect proxy` so local agent-device commands and the agent-device MCP server
#      talk to the remote emulator instead of a local one.
#
# NOTE: connection state is machine-global. While a session is connected,
# every agent-device client on this machine targets it. Run
# `./scripts/remote-sim-android.sh stop` when you are done.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

EAS="npx eas-cli@latest"
ENV_FILE="$PROJECT_ROOT/.env.eas-simulator"

# Android emulators run an internal-distribution APK; there is no separate
# "-simulator" profile the way iOS has one.
BUILD_PROFILE="development"
SIM_PLATFORM="android"
SESSION_NAME="Pancake Theory emulator session"
IDLE_MINUTES="5"
# Empty means "no cap". Unattended callers set one so a wedged session cannot
# bill past the run.
MAX_DURATION_MINUTES=""
BUILD_ID=""
# AVD hardware profile id (e.g. "pixel_7"). Empty means the runner chooses.
DEVICE=""
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
Start (or stop) a remote EAS Simulator session running the latest Android
emulator development build, and point the local agent-device CLI/MCP at it.

Usage:
  ./scripts/remote-sim-android.sh start [options]
  ./scripts/remote-sim-android.sh stop
  ./scripts/remote-sim-android.sh status

Options (start):
  --build-id <id>   Use this EAS Build instead of resolving the latest one.
  --idle <minutes>  Idle timeout before EAS stops the session. Default: 5.
  --max-duration <minutes>
                    Hard cap on session length, whether or not it is idle.
                    Default: no cap.
  --name <name>     Session name shown on expo.dev. Default:
                    "Pancake Theory emulator session".
  --profile <name>  EAS Build profile to resolve from. Default: "development".
  --device <id>     AVD hardware profile id to start (e.g. "pixel_7"). Default:
                    a device chosen by the runner.
  --metro-url <url> Public tunnel URL of a running dev server. The dev build is
                    deep-linked to it on launch, so it connects instead of
                    showing an empty launcher. Start the tunnel first with:
                      EXPO_UNSTABLE_TUNNEL_V2=1 APP_VARIANT=DEV \
                        npx expo start --tunnel
  --open-url <url>  Raw URL to open after launch. Alternative to --metro-url.

"start" does three things:
  1. Resolves the newest finished, unexpired Android development build from the
     build profile (unless --build-id is given).
  2. Runs `eas simulator:start --platform android --type agent-device`, which
     writes AGENT_DEVICE_DAEMON_BASE_URL and AGENT_DEVICE_DAEMON_AUTH_TOKEN
     to .env.eas-simulator.
  3. Runs `agent-device connect proxy` so local agent-device commands and the agent-device MCP server
     talk to the remote emulator instead of a local one.

NOTE: connection state is machine-global. While a session is connected,
every agent-device client on this machine targets it. Run
`./scripts/remote-sim-android.sh stop` when you are done.
EOF
  exit "${1:-0}"
}

# --- resolve the newest usable Android development build ---------------------

# resolve_build_id lives in a shared file because the iOS script and the EAS
# Workflows agent job need the same runtime-match and expiry rules. It reads
# SIM_PLATFORM/BUILD_PROFILE (set above) to target the Android profile.
# Sourced after info()/err() so it reuses this script's coloured output.
# shellcheck source=scripts/lib/resolve-sim-build.sh
. "$PROJECT_ROOT/scripts/lib/resolve-sim-build.sh"

# --- commands ---------------------------------------------------------------

cmd_start() {
  require npx "Install Node.js."
  require python3 "Install Python 3."
  require agent-device "Install it with: npm install --global agent-device"

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
        err "--metro-url must be publicly reachable. The remote emulator cannot"
        err "see your LAN. Start a tunnel first:"
        err "  EXPO_UNSTABLE_TUNNEL_V2=1 APP_VARIANT=DEV npx expo start --tunnel"
        exit 1
        ;;
    esac
    local encoded
    encoded="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$METRO_URL")"
    # Reserved `__expo_*` launch params, read by expo-dev-menu at launch — no
    # rebuild needed. The onboarding explainer and the menu-at-launch are pure
    # noise on a session someone is about to drive. The floating gear button is
    # left on, because a human may want it.
    OPEN_URL="${APP_SCHEME}://expo-development-client/?__expo_disable_onboarding=1&__expo_disable_auto_launch=1&url=${encoded}"
    info "Will open: $OPEN_URL"
  fi

  local open_url_args=()
  [ -n "$OPEN_URL" ] && open_url_args=(--open-url "$OPEN_URL")

  local device_args=()
  [ -n "$DEVICE" ] && device_args=(--device "$DEVICE")

  local max_duration_args=()
  [ -n "$MAX_DURATION_MINUTES" ] && \
    max_duration_args=(--max-duration-minutes "$MAX_DURATION_MINUTES")

  info "Starting remote EAS Simulator session (android, agent-device, idle timeout ${IDLE_MINUTES}m${MAX_DURATION_MINUTES:+, max ${MAX_DURATION_MINUTES}m})..."
  local start_log
  # An explicit template, not `mktemp -t PREFIX`: BSD mktemp appends its own
  # suffix to a bare prefix, but GNU coreutils rejects it with "too few X's in
  # template". This script runs on macOS locally and on a Linux worker in CI.
  start_log="$(mktemp "${TMPDIR:-/tmp}/remote-sim-android-start.XXXXXX")"
  # Stream the CLI output live and keep a copy so the web preview URL can be
  # repeated in the summary below.
  $EAS simulator:start \
    --platform android \
    --type agent-device \
    --name "$SESSION_NAME" \
    --non-interactive \
    --build-id "$BUILD_ID" \
    --max-idle-time-minutes "$IDLE_MINUTES" \
    ${device_args[@]+"${device_args[@]}"} \
    ${max_duration_args[@]+"${max_duration_args[@]}"} \
    ${open_url_args[@]+"${open_url_args[@]}"} \
    --out-config-type dotenv 2>&1 | tee "$start_log"

  [ -f "$ENV_FILE" ] || { err "$ENV_FILE was not written. The session did not start."; exit 1; }

  local tools_url auth_token
  daemon_url="$(read_env_var AGENT_DEVICE_DAEMON_BASE_URL || true)"
  auth_token="$(read_env_var AGENT_DEVICE_DAEMON_AUTH_TOKEN || true)"

  if [ -z "$tools_url" ]; then
    err "AGENT_DEVICE_DAEMON_BASE_URL is missing from $ENV_FILE."
    err "The session may not be an agent-device session. Check: $EAS simulator:list"
    exit 1
  fi

  info "Pointing the local agent-device client at the remote session..."
  # --session default: without it, connect makes a fresh named session, and
  # every later command (and the MCP server) that does not pass that name keeps
  # using local devices. --force replaces a stale connection a failed stop left.
  local connect_args=(--daemon-base-url "$daemon_url" --session default --force)
  [ -n "$auth_token" ] && connect_args+=(--daemon-auth-token "$auth_token")
  agent-device connect proxy "${connect_args[@]}"

  # AGENT_DEVICE_DAEMON_BASE_URL in the shell environment outranks the stored
  # connection and would silently send commands somewhere else.
  if [ -n "${AGENT_DEVICE_DAEMON_BASE_URL:-}" ] && [ "${AGENT_DEVICE_DAEMON_BASE_URL}" != "$daemon_url" ]; then
    err "WARNING: AGENT_DEVICE_DAEMON_BASE_URL is set in your shell to ${AGENT_DEVICE_DAEMON_BASE_URL}."
    err "That variable overrides the link. Unset it for the link to take effect."
  fi

  local preview_url session_id orphan_id
  preview_url="$(grep -o 'https://web-preview-[^ ]*' "$start_log" | tail -n 1 || true)"
  session_id="$(read_env_var EAS_SIMULATOR_SESSION_ID || true)"
  # Starting a session does NOT stop a previous one; it only stops being tracked
  # in .env.eas-simulator. Left alone it bills until its idle/max timeout.
  orphan_id="$(sed -n 's/.*Overwriting previous simulator session (id: \([0-9a-f-]*\)).*/\1/p' "$start_log" | tail -n 1 || true)"
  rm -f "$start_log"

  ok "Remote emulator session is ready."
  cat <<EOF

  Session name : $SESSION_NAME
  Session id   : ${session_id:-<unknown>}
  Build id     : $BUILD_ID
  Idle timeout : ${IDLE_MINUTES} minutes
  Config       : $ENV_FILE
  Web preview  : ${preview_url:-<see output above>}

  Next steps
  ----------
  1. RESTART your editor / Claude Code session. A running \`agent-device mcp\` process
     caches its target at startup and keeps using the local emulator until it
     is relaunched.
  2. Verify the link resolves to the remote session:
       agent-device connection status
       agent-device devices --platform android
  3. Watch session events:
       $EAS simulator:events --follow
  4. When you are done:
       ./scripts/remote-sim-android.sh stop

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

  if command -v agent-device >/dev/null 2>&1; then
    info "Restoring agent-device to local emulators..."
    agent-device disconnect || true
  fi

  rm -f "$ENV_FILE"
  ok "Stopped. Restart your editor so the agent-device MCP server goes back to local emulators."
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
  if command -v agent-device >/dev/null 2>&1; then
    ok "agent-device connection:"
    agent-device connection status 2>&1 | sed 's/^/  /' || \
      info "  agent-device is not connected. It will use local emulators."
  else
    info "agent-device is not installed."
  fi

  if [ -n "${AGENT_DEVICE_DAEMON_BASE_URL:-}" ]; then
    echo
    err "AGENT_DEVICE_DAEMON_BASE_URL is set in this shell and overrides the stored connection."
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
    --device)    DEVICE="${2:-}"; shift 2 ;;
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
