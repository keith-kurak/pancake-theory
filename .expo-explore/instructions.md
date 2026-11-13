# Capture instructions for Pancake Theory

Pancake Theory is an offline breakfast-recipe app. It has no account, no sign-in,
no backend data and no permission prompts. All recipes are bundled with the app.
User data (cooking history, recipe notes, the recipe in progress) is stored on the
device and starts empty on a fresh install. Use the same steps and the same
recipe on both revisions.

## Reaching screens

- The app opens on the tab bar. The tabs are icon-only; their accessibility
  labels are `Chooser` (the `/` screen), `Browse` (`/browse`) and `History`
  (`/history`).
- `/` (Chooser) shows one breakfast card at the top and three "Ratios" sliders
  (Flour, Milk / Water, Eggs). Capture it with the sliders at their default
  positions. Do not drag the sliders.
- `/browse` lists all recipes, grouped by breakfast type. Each recipe row has the
  identifier `recipe-card-<recipe id>`, for example `recipe-card-crepes-basic`.
- `/recipes/[food]` (open `/recipes/crepes`) lists the crepe recipes under a
  bulleted list of tips. The Chooser card (identifier `make-it-button`) also
  opens this kind of screen.
- `/recipes/detail/[id]` (open `/recipes/detail/crepes-basic`) shows the
  "Basic Crepes" recipe with Ingredients, Directions and Notes tabs and a
  "Make it now?" button (identifier `make-it-now-button`). Capture it on the
  Ingredients tab, before you start the recipe.
- On `/history`, the header link with the accessibility label `Info` opens `/info`.
- `/info` shows build and update information and two buttons: "Channel Surfing"
  and "Trigger Crash". "Channel Surfing" opens `/channel-surf`.
- `/privacy` is a static privacy policy. `/modal` is a static modal with the
  title "This is a modal".

## Prerequisites and test inputs

The cooking flow creates the state that four screens need. Do it once, in this
order, after you capture `/history` in its empty state ("No History Yet"):

1. Open `/recipes/detail/crepes-basic`. Tap `make-it-now-button` (identifier).
   The recipe is now in progress and each ingredient row becomes a checkbox.
2. Tap every ingredient row: identifiers `ingredient-0` through `ingredient-5`.
   Basic Crepes has six ingredients. When all are checked, the "I made it!"
   button (identifier `i-made-it-button`) replaces "Cancel Recipe".
3. Tap `i-made-it-button`. This opens `/recipes/feedback/crepes-basic`, titled
   "How did it go?", with five rating stars and an "Add a note" field. This is
   the capture checkpoint for the feedback screen. The feedback screen works
   only while a recipe is in progress; opened without one, it shows
   "No active recipe found." and is not the representative state.
4. Tap `rating-star-4` (identifier), then `feedback-done-button` (identifier).
   This completes the recipe and replaces the screen with `/history`, which now
   lists one "Basic Crepes" entry. Capture `/history` again only if it was not
   captured before; the empty state is the preferred representative state.
5. Tap the "Basic Crepes" history entry. This opens `/history/detail/<id>`, which
   shows the date, the 4-star rating, the prep and cook times, and a
   "View Recipe" button. The id is a random value created on this device; read
   it from the route, do not invent one.
6. Tap the pencil icon at the right of the navigation bar. This opens
   `/history/edit/<same id>`, titled "Basic Crepes", with rating stars, Prep
   Time and Cook Time fields, and a Save button (identifier `save-button`).
   Capture it, then go back without saving.

After the feedback step there is no recipe in progress. To capture the feedback
screen again, you must repeat steps 1 to 3.

## Ready to capture

- A screen is ready when its title or main content is visible and no
  confirmation dialog, keyboard or splash screen covers it.
- On launch, release builds hold the splash screen while they check for an
  update. Wait until the tab bar is visible.
- History dates and durations depend on when the agent ran the flow. They are
  runtime state, not a change.

## Avoid

- Do not tap "Trigger Crash" on `/info`. It crashes the app on purpose.
- On `/channel-surf`, do not type a channel name and do not tap
  "Switch Channel". It downloads a different update and reloads the app.
- Do not tap the trash button (identifier `delete-entry-button`) on the edit
  screen, and do not confirm any "Delete Entry?" or "Cancel Recipe?" dialog.
- If a "Start New Recipe?" dialog appears, a recipe is already in progress:
  tap "Keep Making It" and continue that recipe instead.
- Do not add recipe notes on the Notes tab.
