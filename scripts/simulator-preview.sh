#!/usr/bin/env bash
#
# Start a web-preview-only EAS Simulator session for a build and print its links.
#
#   ./scripts/simulator-preview.sh <ios|android> <build-id>
#
# Prints two lines:
#   preview_url=https://web-preview-...   the live simulator, in a browser
#   session_url=https://expo.dev/...      the session page, which outlives it
#
# "web-preview-only" is the session type with no automation interface — the
# right one for a human clicking a link, and cheaper than the agent-device type.
#
# The session keeps running after this exits, and bills until its idle or max
# timeout. That is the point: the reviewer opens the link later, not now. Keep
# PREVIEW_IDLE_MINUTES low enough that an unopened preview costs little.

set -euo pipefail

PLATFORM="${1:?usage: simulator-preview.sh <ios|android> <build-id>}"
BUILD_ID="${2:?usage: simulator-preview.sh <ios|android> <build-id>}"
IDLE_MINUTES="${PREVIEW_IDLE_MINUTES:-30}"
# EAS also caps this per account (115 minutes here); a larger value fails
# `simulator:start` outright.
MAX_MINUTES="${PREVIEW_MAX_MINUTES:-30}"
NAME="${PREVIEW_NAME:-Simulator preview}"

# Simulator sessions are actor-gated: the restricted EXPO_TOKEN that EAS injects
# into a workflow cannot create one, so the personal token travels under a
# different name and is re-exported over it here. Same reason, and the same
# token, as scripts/agent/lib/sim.sh.
if [ -n "${EXPO_TOKEN_SIMULATOR:-}" ]; then
  export EXPO_TOKEN="$EXPO_TOKEN_SIMULATOR"
fi

json="$(npx --yes eas-cli@latest simulator:start \
  --platform "$PLATFORM" \
  --type web-preview-only \
  --build-id "$BUILD_ID" \
  --name "$NAME" \
  --max-idle-time-minutes "$IDLE_MINUTES" \
  --max-duration-minutes "$MAX_MINUTES" \
  --non-interactive --json)"

# The ${...} below are JS template literals, not shell expansions.
# shellcheck disable=SC2016
printf '%s' "$json" | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const s = JSON.parse(d);
  const preview = (s.remoteConfig && s.remoteConfig.webPreviewUrl) || "";
  if (!preview) {
    console.error("no webPreviewUrl in the session response");
    process.exit(1);
  }
  process.stdout.write(`preview_url=${preview}\n`);
  process.stdout.write(`session_url=${s.deviceRunSessionUrl || ""}\n`);
});'
