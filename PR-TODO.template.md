# <One line: the feature or fix>

## What to build

Describe the change in plain terms. Say what a user should be able to do that they
cannot do today, or what is broken that should not be.

## Where

Name the screens, routes, or components if you already know them. For example:
"the Explore tab (`app/(tabs)/explore.tsx`)". Leave this out if you do not know.

## How to tell it works

List the steps someone would take in the running app, and what they should see. The
agent drives a real simulator against these steps, so be concrete.

1. Open the app on the Home tab.
2. Tap ...
3. Expect to see ...

## Out of scope

Anything nearby that should be left alone.

---

**Notes**

- Keep it to one feature or one fix. A list of unrelated tasks produces a worse result
  than several PRs.
- Prefer JavaScript-only work. A new native module or config plugin changes the native
  fingerprint, which makes the run skip simulator validation and leave the PR in draft.
- Delete this template's instructions before you commit the file.
