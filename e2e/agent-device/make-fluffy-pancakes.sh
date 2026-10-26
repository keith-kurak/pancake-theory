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
# Targeting rule: tap by testID, assert by text.
#
# Text is fine for an assertion, because an assertion only asks whether a string
# is on screen. It is not fine for a tap. This app's list screens hand the
# accessibility tree an ancestor that repeats a descendant's label while
# spanning a far larger frame — on the recipe list the wrapper around the whole
# scroll area carries the FIRST card's label verbatim:
#
#   @e7  [other] "One-bowl Fluffy Pancakes, 9 ingredients, 9 steps"  <- whole list
#     ...
#       @e14 [other] "One-bowl Fluffy Pancakes, 9 ingredients, 9 steps"  <- the card
#
# The labels are identical, so no text can separate them, and which one a text
# search resolves to varies run to run: measured over repeated cold starts, the
# same command tapped the card at (201, 308) on some runs and the wrapper's
# centre at (201, 581) on others. The wrapper's centre falls in the gap between
# two cards, so the tap does nothing, and the run fails several steps later on a
# screen it never left. An id resolves to one node every time.
#
# This is why the components this flow drives carry testIDs. Adding one is the
# correct fix for a target this script cannot hit; adding retries is not.

# reach <text> — wait until this text is on the current surface, scrolling to
# bring it into view. agent-device resolves against the CURRENT surface only, so
# a control below the fold simply is not there; the Maestro flow scrolls for the
# same reason. The attempt count is a bound, not a timeout: a target that is
# genuinely absent fails the run instead of scrolling forever.
reach() {
  local label="$1" _attempt
  for _attempt in 1 2 3 4 5 6; do
    if agent-device wait text "$label" >/dev/null 2>&1; then
      return 0
    fi
    agent-device scroll down --settle >/dev/null 2>&1 || true
  done
  printf '    not reachable: %s\n' "$label" >&2
  return 1
}

# see <text> — assert this text is reachable, without touching it.
see() { reach "$1"; }

# tap <testID> — click the element with this id, scrolling to reach it.
#
# A tap is never its own assertion: `click` reports success whenever it hits
# something. Each navigation below therefore asserts a landmark that belongs to
# the destination and nowhere else.
tap() {
  local id="$1" _attempt
  for _attempt in 1 2 3 4 5 6; do
    if agent-device click "id=\"$id\"" --settle >/dev/null 2>&1; then
      return 0
    fi
    agent-device scroll down --settle >/dev/null 2>&1 || true
  done
  printf '    could not tap: %s\n' "$id" >&2
  return 1
}

# check_off <index> <name> — check an ingredient row off, and verify it stuck.
#
# `click` reports success whenever it resolves a node, and every row resolves
# whether or not it is on screen — agent-device's `visible` predicate is an
# accessibility flag, not a question about the viewport, and it answers true for
# a row well below the fold. So a click aimed at an off-screen row returns 0
# while delivering no press. That is how the last ingredient stayed unchecked
# through a run that reported checking all nine, leaving "I made it!" unrendered
# three steps later.
#
# The row's own label is the ground truth: checking one off prefixes it with
# "selected, " ("1 large Egg" becomes "selected, 1 large Egg"). This taps only
# while that prefix is missing, so it is safe to retry — a second tap on a
# checked row would toggle it back off.
check_off() {
  local idx="$1" name="$2" sel _attempt
  sel="id=\"ingredient-$idx\""
  for _attempt in 1 2 3 4 5 6; do
    case "$(agent-device get text "$sel" 2>/dev/null)" in
      selected,*)
        printf '    checked off: %s\n' "$name" >&2
        return 0
        ;;
    esac
    agent-device click "$sel" --settle >/dev/null 2>&1 || true
    case "$(agent-device get text "$sel" 2>/dev/null)" in
      selected,*)
        printf '    checked off: %s\n' "$name" >&2
        return 0
        ;;
    esac
    agent-device scroll down --settle >/dev/null 2>&1 || true
  done
  printf '    could not check off: %s\n' "$name" >&2
  return 1
}

# --- install and launch -----------------------------------------------------

step "Boot $DEVICE and install $APP_ID"
agent-device boot "${TARGET[@]}" >/dev/null
# reinstall, not install: it replaces the app AND discards its data. The recipe
# in progress is persisted to disk, so a run that failed partway through leaves
# a half-checked recipe behind, and the next run opens to "Cancel Recipe" with
# no "Make it now?" anywhere. A cold start does not clear that — only a wipe
# does. On a fresh CI worker this is a no-op; on a reused device it is what
# makes the run deterministic.
agent-device reinstall "$APP_ID" "$APP_PATH" "${TARGET[@]}" >/dev/null

step "Open the app"
# --relaunch forces a cold start, so no screen survives from an earlier shard.
agent-device open "$APP_ID" "${TARGET[@]}" --relaunch --foreground >/dev/null

# --- smoke: chooser to recipe list ------------------------------------------

step "Chooser is up"
# A real wait, not `see`: the app may still be launching, and this label is at
# the top of the first screen, so there is nothing to scroll to.
agent-device wait text "Make it" >/dev/null
shot 01-chooser

tap "make-it-button"
see "Fluffy Pancakes"
shot 02-recipes

# --- start the recipe -------------------------------------------------------

step "Open Fluffy Pancakes and start it"
tap "recipe-card-pancakes-one-bowl"
# A landmark at the TOP of the detail screen that exists ONLY there. Not
# "ingredients": every card in the list reads "9 ingredients, 9 steps", so it
# matches without leaving the list and reports a screen we never reached.
# "Directions" is a tab on the detail screen and appears nowhere in the list.
see "Directions"
shot 03-detail

tap "make-it-now-button"
# "Cancel Recipe" only exists once the recipe is active, so it is the assertion
# that the tap did something, not just that the screen still renders.
see "Cancel Recipe"
shot 04-active

# --- check off every ingredient ---------------------------------------------

step "Check off all 9 ingredients"
# Indexes, not names, and in the order IngredientsTab renders them. Names are
# ambiguous in both directions here: "sugar" is really "Granulated sugar or
# sweetener" and "Butter" is "Butter (melted)", so a literal name matches
# nothing while a partial one risks matching a neighbour.
INGREDIENTS=(
  "All-purpose flour"
  "Granulated sugar or sweetener"
  "Baking powder"
  "Baking soda"
  "Salt"
  "Milk"
  "Butter (melted)"
  "Vanilla extract"
  "Egg"
)
for i in "${!INGREDIENTS[@]}"; do
  check_off "$i" "${INGREDIENTS[$i]}"
done
shot 05-ingredients-checked

# --- finish and rate --------------------------------------------------------

step "Finish the recipe"
tap "i-made-it-button"
see "Tap to rate"
shot 06-rate

step "Rate it"
# The stars are identical unlabelled glyphs, so they are only separable by id.
# This taps the 4th and asserts "Good", matching .maestro/make-fluffy-pancakes.yaml.
tap "rating-star-4"
see "Good"
shot 07-rated

tap "feedback-done-button"

# --- land on history --------------------------------------------------------

step "Back on the history tab"
see "History"
shot 08-history

printf '\n=== passed: screenshots in %s\n' "$ARTIFACTS" >&2
