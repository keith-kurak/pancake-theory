# shellcheck shell=bash
#
# Bring up a tunnelled Metro dev server and a remote EAS Simulator session, then
# tear them both down.
#
# The simulator runs on EAS, not on this worker, so the job needs no Mac and no
# nested virtualisation — linux-medium is enough. The cost is that the simulator
# cannot see this worker's loopback, so Metro must be published over a tunnel.
#
# Session lifecycle is delegated to scripts/remote-sim.sh, the same script used
# for local work. It resolves a runtime-matched build, starts the session with
# the dev-server deep link, and runs `argent link` so every argent client here
# targets the remote device.

: "${METRO_PORT:=8081}"
: "${AGENT_OUT:=agent-out}"
: "${SIM_IDLE_MINUTES:=5}"
: "${SIM_MAX_DURATION_MINUTES:=25}"

METRO_PID=""
METRO_URL=""
SIM_UDID=""
SIM_STARTED=0

# Simulator sessions are actor-gated: the restricted EXPO_TOKEN that EAS injects
# into every job cannot create one, so a personal access token is passed under a
# different name and re-exported over it. A secret named EXPO_TOKEN would simply
# be shadowed by the injected one.
#
# Provenance: this is not in Expo's public documentation. It comes from Expo's
# internal expo-bot verification workflow, which hit the same wall. Keep the
# override until the docs say otherwise.
if [ -n "${EXPO_TOKEN_SIMULATOR:-}" ]; then
  export EXPO_TOKEN="$EXPO_TOKEN_SIMULATOR"
  echo "sim: using EXPO_TOKEN_SIMULATOR for eas commands" >&2
fi

# sim_require_token — fail early and explain, rather than letting eas-cli report
# a waitlist message that reads like the account lacks access.
sim_require_token() {
  [ -n "${EXPO_TOKEN_SIMULATOR:-}" ] && return 0
  echo "sim: EXPO_TOKEN_SIMULATOR is not set." >&2
  echo "sim: Simulator sessions are actor-gated, so the worker's own EXPO_TOKEN" >&2
  echo "sim: cannot create one. Add a personal access token as" >&2
  echo "sim: EXPO_TOKEN_SIMULATOR. See .eas/workflows/SETUP.md." >&2
  return 1
}

_argent() { npx --yes @swmansion/argent@latest "$@"; }

# --- metro ------------------------------------------------------------------

# metro_start — start Metro behind a public tunnel and set METRO_URL.
#
# --tunnel, not a plain port: a remote simulator cannot reach this worker's LAN.
metro_start() {
  mkdir -p "$AGENT_OUT"
  EXPO_UNSTABLE_TUNNEL_V2=1 APP_VARIANT=DEV EXPO_NO_TELEMETRY=1 CI=1 \
    npx expo start --tunnel --port "$METRO_PORT" > "$AGENT_OUT/metro.log" 2>&1 &
  METRO_PID=$!
  echo "metro: starting with a tunnel on port $METRO_PORT (pid $METRO_PID)" >&2

  local waited=0
  until curl --silent --fail "http://localhost:$METRO_PORT/status" >/dev/null 2>&1; do
    if ! kill -0 "$METRO_PID" 2>/dev/null; then
      echo "metro: exited early. Last lines:" >&2
      tail -n 40 "$AGENT_OUT/metro.log" >&2
      return 1
    fi
    if [ "$waited" -ge 180 ]; then
      echo "metro: did not answer /status within 180s" >&2
      tail -n 40 "$AGENT_OUT/metro.log" >&2
      return 1
    fi
    sleep 3
    waited=$(( waited + 3 ))
  done

  # The tunnel host is announced separately from /status, so keep waiting for it.
  # Metro prints "Waiting on exp+<slug>://<host>"; the https form is the same
  # host with a different scheme.
  waited=0
  until [ -n "$METRO_URL" ]; do
    METRO_URL="$(grep -ao 'exp+[a-z0-9-]*://[a-z0-9.-]*' "$AGENT_OUT/metro.log" \
      | tail -n 1 | sed 's|^exp+[a-z0-9-]*://|https://|')"
    [ -n "$METRO_URL" ] && break
    if [ "$waited" -ge 120 ]; then
      echo "metro: no tunnel URL appeared within 120s" >&2
      tail -n 40 "$AGENT_OUT/metro.log" >&2
      return 1
    fi
    sleep 3
    waited=$(( waited + 3 ))
  done

  echo "metro: ready at $METRO_URL" >&2
}

# --- remote simulator session -----------------------------------------------

# sim_start — start the EAS Simulator session pointed at METRO_URL.
#
# remote-sim.sh does the build resolution, the deep link, and `argent link`.
# --max-duration is a billing backstop: a wedged session cannot outlive the run.
sim_start() {
  [ -n "$METRO_URL" ] || { echo "sim: metro_start must run first" >&2; return 1; }

  SIM_STARTED=1
  if ! ./scripts/remote-sim.sh start \
      --metro-url "$METRO_URL" \
      --idle "$SIM_IDLE_MINUTES" \
      --max-duration "$SIM_MAX_DURATION_MINUTES" \
      --name "Agent run PR #${PR_NUMBER:-local}" \
      > "$AGENT_OUT/simulator-start.log" 2>&1; then
    echo "sim: remote-sim.sh start failed. Last lines:" >&2
    tail -n 30 "$AGENT_OUT/simulator-start.log" >&2
    return 1
  fi

  echo "sim: remote session started and argent linked" >&2
}

# sim_wait_for_device — set SIM_UDID from the linked session's booted iPhone.
#
# A remote argent session exposes one booted iOS device plus some Apple TV
# runtimes, so filter rather than taking the first entry.
sim_wait_for_device() {
  local waited=0
  while [ "$waited" -lt 120 ]; do
    SIM_UDID="$(_argent run list-devices --json 2>/dev/null | python3 -c '
import json, sys
try:
    devices = json.load(sys.stdin).get("devices", [])
except Exception:
    sys.exit(0)
for d in devices:
    if (d.get("platform") == "ios"
            and str(d.get("state", "")).lower() == "booted"
            and d.get("runtimeKind") == "mobile"
            and d.get("udid")):
        print(d["udid"])
        break
')"
    if [ -n "$SIM_UDID" ]; then
      echo "argent: booted device is $SIM_UDID" >&2
      return 0
    fi
    sleep 5
    waited=$(( waited + 5 ))
  done
  echo "argent: no booted iOS device appeared within ${waited}s" >&2
  return 1
}

# --- startup dialogs --------------------------------------------------------

# sim_tap_button <label>
#
# Tap an AXButton by its exact label. Coordinates come from Argent's
# accessibility tree, never from a guess or a screenshot. Returns non-zero when
# the button is not on screen.
sim_tap_button() {
  local label="$1" centre x y
  centre="$(_argent run describe --udid "$SIM_UDID" 2>/dev/null \
    | python3 -c '
import json, re, sys
try:
    text = json.load(sys.stdin).get("description", "")
except Exception:
    sys.exit(0)
# A describe line may carry attributes between the label and the frame, e.g.
#   AXButton "Close" id="xmark"  (0.856, 0.459, 0.086, 0.040)
# so allow anything that is not a newline or an opening paren in between.
pattern = (r"AXButton \"" + re.escape(sys.argv[1]) + r"\"[^\n(]*"
           r"\(([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\)")
m = re.search(pattern, text)
if m:
    fx, fy, fw, fh = (float(g) for g in m.groups())
    print(f"{fx + fw / 2:.4f} {fy + fh / 2:.4f}")
' "$label")"

  [ -n "$centre" ] || return 1
  read -r x y <<< "$centre"
  _argent run gesture-tap --udid "$SIM_UDID" --x "$x" --y "$y" >/dev/null 2>&1
  echo "sim: tapped \"$label\" at ($x, $y)" >&2
}

# Buttons that stand between a cold simulator and a usable app, in the order
# they appear. Nothing in CI taps any of them:
#
#   Open     — iOS 26 confirms every custom-scheme open with an
#              "Open in <app>?" alert, cold launch or not.
#   Continue — expo-dev-client's one-time developer-menu explainer on a fresh
#              install, which covers the whole screen.
#   Close    — the developer menu sheet the explainer leaves behind.
#
SIM_STARTUP_BUTTONS=(Open Continue Close)

# sim_clear_startup_prompts [limit_seconds]
#
# Drain the list until a full pass finds nothing, so a dialog that only appears
# after the previous one is dismissed is still caught. Nothing here is fatal on
# its own — a future iOS or dev-client may drop a prompt — and the caller still
# fails honestly if the app never loads a bundle.
sim_clear_startup_prompts() {
  local limit="${1:-90}" waited=0 tapped_any=0 tapped_this_pass label

  while [ "$waited" -lt "$limit" ]; do
    tapped_this_pass=0
    for label in "${SIM_STARTUP_BUTTONS[@]}"; do
      if sim_tap_button "$label"; then
        tapped_this_pass=1
        tapped_any=1
        sleep 2
      fi
    done

    if [ "$tapped_this_pass" -eq 0 ] && [ "$tapped_any" -eq 1 ]; then
      echo "sim: startup prompts cleared after ${waited}s" >&2
      return 0
    fi

    sleep 3
    waited=$(( waited + 3 ))
  done

  if [ "$tapped_any" -eq 1 ]; then
    echo "sim: still seeing startup prompts after ${limit}s; continuing anyway" >&2
  else
    echo "sim: no startup prompts appeared within ${limit}s" >&2
  fi
}

# --- argent -----------------------------------------------------------------

# argent_mcp_config <path> — write the --mcp-config file Claude will load.
#
# The MCP server reads the global link written by `argent link` at startup, so
# it targets the remote session without any extra wiring here.
argent_mcp_config() {
  local path="$1"
  cat > "$path" <<'JSON'
{
  "mcpServers": {
    "argent": {
      "command": "npx",
      "args": ["--yes", "@swmansion/argent@latest", "mcp"]
    }
  }
}
JSON
  echo "$path"
}

# --- teardown ---------------------------------------------------------------

# Safe to call more than once, and safe when nothing ever started. Stopping the
# session matters more here than locally: it bills until its timeout otherwise.
sim_teardown() {
  if [ "$SIM_STARTED" -eq 1 ]; then
    ./scripts/remote-sim.sh stop >> "$AGENT_OUT/simulator-start.log" 2>&1 \
      || echo "sim: remote-sim.sh stop failed; check for a stray session" >&2
  fi
  if [ -n "$METRO_PID" ] && kill -0 "$METRO_PID" 2>/dev/null; then
    kill -TERM "$METRO_PID" 2>/dev/null || true
  fi
}
