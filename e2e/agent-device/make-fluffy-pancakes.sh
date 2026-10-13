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
# Overridable by environment: E2E_APP_ID, E2E_PLATFORM, E2E_ARTIFACTS, and
# E2E_DEVICE — which, left unset, is discovered from the machine.

set -euo pipefail

APP_PATH="${1:?usage: make-fluffy-pancakes.sh <path-to-.app-or-.apk>}"
APP_ID="${E2E_APP_ID:-com.keithkurak.pancaketheory}"
PLATFORM="${E2E_PLATFORM:-ios}"
DEVICE="${E2E_DEVICE:-}"
ARTIFACTS="${E2E_ARTIFACTS:-agent-out/e2e}"

mkdir -p "$ARTIFACTS"

# Resolve the device instead of hardcoding one. A fixed name is a portability
# trap: the simulators on an EAS macOS worker are not the ones on a laptop, and
# a name that exists in one place fails with DEVICE_NOT_FOUND in the other.
# Newest iPhone first, so the choice is stable across runs on the same image.
if [ -z "$DEVICE" ]; then
  # ${...} and $1 below are JS, not shell.
  # shellcheck disable=SC2016
  DEVICE="$(agent-device devices --json 2>/dev/null | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  let devices = [];
  try { devices = JSON.parse(d).data.devices || []; } catch {}
  const sims = devices.filter(
    (x) => x.platform === "ios" && x.kind === "simulator" && x.target === "mobile"
  );
  const phones = sims.filter((x) => /^iPhone/.test(x.name));
  // Rank by model number, so "iPhone 17 Pro Max" beats "iPhone SE". A plain
  // string sort puts SE on top, which is the smallest screen available.
  const model = (n) => (n.match(/^iPhone (\d+)/) ? Number(RegExp.$1) : -1);
  const pick = (phones.length ? phones : sims).sort(
    (a, b) => model(b.name) - model(a.name) || b.name.localeCompare(a.name)
  )[0];
  process.stdout.write(pick ? pick.name : "");
});')"
fi

if [ -z "$DEVICE" ]; then
  echo "no bootable iOS simulator on this machine. agent-device sees:" >&2
  agent-device devices >&2 || true
  exit 1
fi

TARGET=(--platform "$PLATFORM" --device "$DEVICE")

step()  { printf '\n=== %s\n' "$*" >&2; }
shot()  { agent-device screenshot --out "$ARTIFACTS/$1.png" --normalize-status-bar >/dev/null; }

# The session outlives a failure, and a stray simulator session on a CI worker
# is worse than a noisy teardown.
cleanup() { agent-device close >/dev/null 2>&1 || true; }
trap cleanup EXIT

# --- helpers -----------------------------------------------------------------
#
# Two facts about agent-device shape every helper below.
#
# 1. It resolves a target against the CURRENT surface only. A control below the
#    fold simply is not there, which is why the Maestro flow scrolls too. The
#    attempt counts here are bounds, not timeouts: a target that is genuinely
#    absent fails the run instead of scrolling forever.
#
# 2. `find ... click` reports success whenever it taps SOMETHING. It is not an
#    assertion that the tap achieved anything, so a tap that lands on the wrong
#    node passes here and fails several steps later on a screen the run never
#    left. Every tap therefore waits for its target first and settles after, and
#    every navigation asserts a landmark belonging to the destination.

# reach <text> — wait until this text is on the current surface, scrolling to
# bring it into view. Also the settling point: a find issued before the screen
# has rendered resolves against the outgoing one.
reach() {
  local label="$1" _attempt
  for _attempt in 1 2 3 4 5 6; do
    if agent-device wait text "$label" >/dev/null 2>&1; then
      return 0
    fi
    agent-device scroll down --settle >/dev/null 2>&1 || true
  done
  printf '    could not reach: %s\n' "$label" >&2
  return 1
}

# see <text> — assert this text is reachable, without touching it.
see() { reach "$1"; }

# tap <text> — click the element matching this text.
#
# --last, NOT --first. A React Native screen hands the accessibility tree
# ancestor nodes that repeat a descendant's label while spanning a much larger
# frame. On the recipe list the outer wrapper around the whole scroll area
# carries the FIRST card's label verbatim:
#
#   @e7  [other] "One-bowl Fluffy Pancakes, 9 ingredients, 9 steps"  <- whole list
#     ...
#       @e14 [other] "One-bowl Fluffy Pancakes, 9 ingredients, 9 steps"  <- the card
#
# The labels are identical, so no text can tell them apart. --first picks @e7
# and taps its centre, which falls in the gap between two cards and does
# nothing. --last picks the deepest match, and a deeper node's frame is always
# inside its ancestors', so the tap lands on the thing itself.
tap() {
  local label="$1"
  reach "$label" || return 1
  agent-device find "$label" click --last >/dev/null 2>&1 || {
    printf '    could not tap: %s\n' "$label" >&2
    return 1
  }
  # --settle is rejected on find, so settle explicitly.
  agent-device wait stable 300 5000 >/dev/null 2>&1 || true
}

# check_off <ingredient> — tap an ingredient row and say so.
check_off() {
  tap "$1" || return 1
  printf '    checked off: %s\n' "$1" >&2
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
# A real wait, not `see`: the app may still be launching, and this label is at
# the top of the first screen, so there is nothing to scroll to.
agent-device wait text "Make it" >/dev/null
shot 01-chooser

tap "Make it"
see "Fluffy Pancakes"
shot 02-recipes

# --- start the recipe -------------------------------------------------------

step "Open Fluffy Pancakes and start it"
tap "Fluffy Pancakes"
# A landmark at the TOP of the detail screen, and one that exists ONLY there.
# "ingredients" is not: every card in the list reads "9 ingredients, 9 steps",
# so it matches without leaving the list and reports a screen we never reached.
# "Directions" is a tab on the detail screen and appears nowhere in the list.
see "Directions"
shot 03-detail

tap "Make it now?"
# "Cancel Recipe" only exists once the recipe is active, so it is the assertion
# that the tap did something, not just that the screen still renders.
see "Cancel Recipe"
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
tap "I made it!"
see "Tap to rate"
shot 06-rate

step "Rate it"
# The five stars are identical unlabelled "*" glyphs, so only the first and last
# are addressable. --last here means the fifth star, not merely the deepest node. The Maestro flow taps the 4th ("Good"); this taps the 5th and
# asserts "Perfect!" instead. Give the star buttons an accessibilityLabel and
# this can target any of them.
agent-device find "★" click --last >/dev/null
see "Perfect!"
shot 07-rated

tap "Done"

# --- land on history --------------------------------------------------------

step "Back on the history tab"
see "History"
shot 08-history

printf '\n=== passed: screenshots in %s\n' "$ARTIFACTS" >&2
