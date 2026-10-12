# Release process

How code on `main` reaches the App Store and Google Play. The EAS workflows in
[`.eas/workflows`](.eas/workflows) do most of it. One GitHub release per runtime version
tells them what to do.

## Key terms

**App version.** The `version` in [`app.json`](app.json), for example `1.5.0`.

**Runtime version.** The major and minor of the app version, with patch `0`. For
example, `1.5.3` has runtime version `1.5.0`
([`app.config.js`](app.config.js)). A store binary only accepts OTA updates for its
own runtime version. A patch bump keeps the runtime version, and a minor or major
bump starts a new one.

**Binary release.** A GitHub release tagged with the runtime version: `1.5.0`, or
`v1.5.0`. Its flags set the mode for that runtime version:

| GitHub release | Mode | Merges to `main` |
| --- | --- | --- |
| Draft, or flagged pre-release | **Pre-release** | Replace the store binaries, and submit them |
| Neither flag | **Release** | Publish an OTA update |
| No release | None | Fail, and tell you to create one |

**Matching store build.** A production store build (`production` profile, store
distribution) with the same runtime version and fingerprint as `main`. The workflows
need a match on **both** iOS and Android before they do anything with either one. If
one platform does not match, the native layer changed.

### Tags

| Tag | Made by | Meaning |
| --- | --- | --- |
| `1.5.0` | You, or `mint-prerelease.yaml` | The binary release for the runtime version. Sets the mode. |
| `1.5.0-ota-3f9a1c` | `deploy-production-on-main.yaml` | An OTA update to production, by update group. |
| `1.5.1-rollup` | `weekly-store-rollup.yaml` | A weekly store binary at a new patch version. |

Only the exact runtime version tag sets the mode. The `-ota-` and `-rollup` tags never
do.

## One decision, two workflows

[`decide-deploy`](.eas/functions/decide-deploy/function.yml) makes the decision for both
`deploy-production-on-main.yaml` and `weekly-store-rollup.yaml`. Its inputs are the
release state and the matching store builds:

| Release state | Both platforms match? | `action` |
| --- | --- | --- |
| Pre-release | Yes | `build-or-repack`: repack iOS, build Android |
| Pre-release | No | `build-or-repack`: build iOS and Android |
| Release | Yes | `update` |
| Release | No | `error`: the native layer changed |
| None | Yes or no | `error`: there is no release to decide from |

Android always gets a full build. Production Android builds are app bundles (`.aab`),
and repack cannot process them.

## Pre-release mode

The version is still being assembled. The store binaries are not live yet, so the
workflows can replace them.

### Start a new version

1. **Bump the app version** in `app.json`, for example from `1.5.3` to `1.6.0`. This
   starts runtime version `1.6.0`.
2. **Label the PR `store-next`.** No production build exists for the new runtime
   version yet, so `check-fingerprint-on-pr.yaml` would fail the PR. With the label,
   `store-next-preview.yaml` makes preview builds of the PR in its place.
3. **Merge the PR.** The deploy on `main` fails, because no release is tagged `1.6.0`
   yet. This is expected.
4. **Mint the pre-release:**

   ```bash
   npx eas-cli@latest workflow:run .eas/workflows/mint-prerelease.yaml --ref main
   ```

   This creates the release `1.6.0`, flagged pre-release, on the head of `main`. It
   stops if the runtime version already has a release.
5. **Run the deploy again**, or push to `main`:

   ```bash
   npx eas-cli@latest workflow:run .eas/workflows/deploy-production-on-main.yaml --ref main
   ```

   No store build matches yet, so it builds iOS and Android and submits both.

### Each merge to `main`

`deploy-production-on-main.yaml` gets `build-or-repack`:

- **iOS:** repack the matching store build, or make a full build when the platforms do
  not both match. Then submit it to App Store Connect, for TestFlight.
- **Android:** make a full build, and submit it to Google Play.

A native change is allowed in this mode, because the next build carries it. But
`check-fingerprint-on-pr.yaml` still fails a PR whose fingerprint does not match the
current store builds. Label that PR `store-next`.

The weekly rollup skips, because each merge already replaces the binaries.

### Ship it

1. Send the build for review in App Store Connect and in the Google Play Console. The
   workflows only upload builds. They do not send them for review or release them.
2. When App Store Connect reports the version **ready for distribution**,
   `promote-release-on-distribution.yaml` clears both flags on the release. The runtime
   version is now in release mode.

Google Play does not start this workflow. If Android goes live first, or you need to
switch modes by hand, clear the draft and pre-release flags on the GitHub release
yourself.

## Release mode

The store binaries are live. Only JavaScript can change for this runtime version.

### Each merge to `main`

`deploy-production-on-main.yaml` gets `update` and publishes an OTA update to the
`production` channel, for both platforms. Then it tags the update as a GitHub release,
`<runtime version>-ota-<group id>`.

If `main` no longer matches the store builds on both platforms, the deploy gets `error`
and fails. The update cannot reach the live binaries, and they cannot be replaced. Drop
the native change, or start a new version. `check-fingerprint-on-pr.yaml` runs the same
check on each PR, so this usually shows before the merge.

### Weekly rollup

New installs get the binary as it was at release, then download every update since. To
keep that list short, `weekly-store-rollup.yaml` runs on Mondays at 14:17 GMT:

1. It skips if `main` has no commits since the last rollup, or since the binary release
   if there is no rollup yet.
2. It asks `decide-deploy` for the same decision as the deploy. It continues only on
   `update`. On `build-or-repack` (pre-release) it skips, and on `error` it fails.
3. It takes the next patch version: `1.6.0`, then `1.6.1`, then `1.6.2`. The runtime
   version does not change, so the new binary gets the same updates.
4. It repacks iOS and builds Android at that version, and submits both.
5. After both submits succeed, it creates the release `1.6.N-rollup`.

As with any upload, send the rollup builds for review in each store yourself.

To run it now:

```bash
npx eas-cli@latest workflow:run .eas/workflows/weekly-store-rollup.yaml --ref main
```

## When a deploy fails

`decide-deploy` writes the reason and the fix in the run's summary. The usual cases:

| Reason | Fix |
| --- | --- |
| No release for the runtime version | Mint the pre-release, then run the deploy again. |
| Both platforms match, but no release | Mint a pre-release, or create a full release if the binaries are already live. |
| Release mode, and a platform does not match | Revert the native change, or bump the app version to start a new version. |

A store build does not match when the native layer changed. Common causes: a
dependency with native code was added, removed, or upgraded; a config plugin, or a
value it reads, changed; or something in `app.json` that affects the native project
changed.

## Setup

- **`GH_TOKEN`** in the EAS `production` environment, with **write** access to
  repository contents. The release lookup only reads. Minting, OTA tags, rollups, and
  promotion all write.
- **Store submission credentials** for both platforms. `eas.json` has no Android submit
  settings, so Android uploads use the default Google Play track.
- **A production store build on both platforms** for the current runtime version. Until
  both exist, the decision cannot get `update`.
