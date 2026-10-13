#!/usr/bin/env bash
#
# Deterministic agent-device end-to-end run: make Fluffy Pancakes and rate it.
#
# The agent-device counterpart of .maestro/preview-smoke.yaml and
# .maestro/make-fluffy-pancakes.yaml. Every target here is a literal string
# fixed at author time — nothing is chosen while the run is in flight — so two
# runs issue the same commands in the same order against the same screens.
#
#   ./e2e/agent-device/make-fluffy-pancakes.sh <path-to-app-artifact>
#
# Overridable by environment: E2E_APP_ID, E2E_PLATFORM, E2E_DEVICE,
# E2E_ARTIFACTS.

set -euo pipefail

APP_PATH="${1:?usage: make-fluffy-pancakes.sh <path-to-.app-or-.apk>}"
APP_ID="${E2E_APP_ID:-com.keithkurak.pancaketheory}"
PLATFORM="${E2E_PLATFORM:-ios}"
DEVICE="${E2E_DEVICE:-iPhone 17 Pro Max}"
ARTIFACTS="${E2E_ARTIFACTS:-agent-out/e2e}"

TARGET=(--platform "$PLATFORM" --device "$DEVICE")
mkdir -p "$ARTIFACTS"

step()  { printf '\n=== %s\n' "$*" >&2; }
shot()  { agent-device screenshot --out "$ARTIFACTS/$1.png" --normalize-status-bar >/dev/null; }

# The session outlives a failure, and a stray simulator session on a CI worker
# is worse than a noisy teardown.
cleanup() { agent-device close >/dev/null 2>&1 || true; }
trap cleanup EXIT

# tap <text> — click the first element matching this text.
#
# `find` resolves against the current snapshot, so it fails rather than guessing
# when the label is absent. --first keeps a duplicate label from being ambiguous.
tap() { agent-device find "$1" click --first >/dev/null; }

# check_off <ingredient> — tap an ingredient row, scrolling down until it is on
# screen. The attempt count is a bound, not a timeout: a missing ingredient
# fails the run instead of scrolling forever.
check_off() {
  local label="$1" _attempt
  for _attempt in 1 2 3 4 5 6; do
    if agent-device find "$label" click --first >/dev/null 2>&1; then
      printf '    checked off: %s\n' "$label" >&2
      return 0
    fi
    agent-device scroll down --settle >/dev/null
  done
  printf '    could not reach ingredient: %s\n' "$label" >&2
  return 1
}

# --- install and launch -----------------------------------------------------

step "Boot $DEVICE and install $APP_ID"
agent-device boot "${TARGET[@]}" >/dev/null
agent-device install "$APP_ID" "$APP_PATH" "${TARGET[@]}" >/dev/null

step "Open the app"
# --relaunch guarantees a cold start, so a session left over from an earlier
# shard cannot carry a half-finished recipe into this run.
agent-device open "$APP_ID" "${TARGET[@]}" --relaunch --foreground >/dev/null

# --- smoke: chooser to recipe list ------------------------------------------

step "Chooser is up"
agent-device wait text "Make it" >/dev/null
shot 01-chooser

tap "Make it"
agent-device wait text "Fluffy Pancakes" >/dev/null
shot 02-recipes

# --- start the recipe -------------------------------------------------------

step "Open Fluffy Pancakes and start it"
tap "Fluffy Pancakes"
agent-device wait text "Make it now?" >/dev/null
shot 03-detail

tap "Make it now?"
# "Cancel Recipe" only exists once the recipe is active, so it is the assertion
# that the tap did something, not just that the screen still renders.
agent-device wait text "Cancel Recipe" >/dev/null
shot 04-active

# --- check off every ingredient ---------------------------------------------

step "Check off all 9 ingredients"
INGREDIENTS=(
  "All-purpose flour"
  "sugar"
  "Baking powder"
  "Baking soda"
  "Salt"
  "Milk"
  "Butter"
  "Vanilla extract"
  "Egg"
)
for ingredient in "${INGREDIENTS[@]}"; do
  check_off "$ingredient"
done
shot 05-ingredients-checked

# --- finish and rate --------------------------------------------------------

step "Finish the recipe"
agent-device wait text "I made it!" >/dev/null
tap "I made it!"
agent-device wait text "Tap to rate" >/dev/null
shot 06-rate

step "Rate it"
# The five stars are identical unlabelled "*" glyphs, so only the first and last
# are addressable. The Maestro flow taps the 4th ("Good"); this taps the 5th and
# asserts "Perfect!" instead. Give the star buttons an accessibilityLabel and
# this can target any of them.
agent-device find "★" click --last >/dev/null
agent-device wait text "Perfect!" >/dev/null
shot 07-rated

tap "Done"

# --- land on history --------------------------------------------------------

step "Back on the history tab"
agent-device wait text "History" >/dev/null
shot 08-history

printf '\n=== passed: screenshots in %s\n' "$ARTIFACTS" >&2
