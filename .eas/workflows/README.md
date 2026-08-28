# EAS Workflows

Automation for this app, all of it in EAS — there is no GitHub Actions setup.

| Workflow | Trigger | What it does |
|---|---|---|
| `agent-pr.yaml` | `agent` label on a draft PR | Implements `PR-TODO.md`, validates on a simulator, commits, flips the PR to ready |
| `update-on-pr.yaml` | Any PR | Unit tests, then publishes a preview update and comments on the PR |
| `maybe-make-dev-builds-on-pr.yaml` | Any PR | Builds development clients when the fingerprint changed |
| `build-or-update-preview.yaml` | Push to `main` | Publishes an update, or builds when the fingerprint changed |
| `build-or-repack-preview.yaml` | Push to `main` | Builds or repacks preview binaries |
| `build-or-repack-then-maestro.yaml` | Push to `main` | The above, then Maestro E2E on iOS and Android |
| `observe-events-test.yaml` | Daily at 04:00 GMT | Maestro run that checks `expo-observe` events |
| `store-screenshots.yaml` | Manual | Captures App Store / Play screenshots |
| `build-production.yaml` | Manual | Production builds and store submissions |

---

# Agent PR

Describe a feature or fix once, in a file. Get back a validated PR.

## How to use it

1. Branch, and add a `PR-TODO.md` at the repository root. Copy
   [`PR-TODO.template.md`](../../PR-TODO.template.md) and fill it in.
2. Open a **draft** pull request.
3. Add the **`agent`** label.

The run takes up to 30 minutes. Watch it on the EAS dashboard.

**Passing run** — the code is committed to your branch, the PR description gains a
results block, and the PR is flipped to *ready for review*.

**Failing run** — the code is still committed, the results block explains what went
wrong, a comment lists the blockers, and the PR **stays in draft**. Fix the task
description or the code, then re-apply the label to run again. The results block is
replaced, not appended, so repeat runs stay readable.

Re-labelling a PR that is already out of draft does nothing. That guard exists so a
run cannot rewrite a branch under a reviewer.

## What the run actually does

| Phase | Budget | Detail |
|---|---|---|
| 0. Preflight | ~1 min | Check secrets, read `PR-TODO.md`, record the iOS fingerprint |
| 1. Implement | 15 min | Claude writes the code, then lint and `npx bun test` |
| 2. Gate | seconds | Recompute the fingerprint |
| 3. Validate | 10 min | Publish Metro over a tunnel, start a remote EAS Simulator on it, drive the app |
| 4. Publish | 4 min | Commit, push, rewrite the PR description, flip to ready or comment |

Everything runs in one `linux-medium` job. The simulator runs **on EAS**, not on the
worker, so this needs no Mac and no nested virtualisation — the job only runs Metro, the
`eas` CLI, and Claude. The trade is that the remote simulator cannot see the worker's
loopback, so Metro is published over a tunnel.

It is a single job because Metro, the simulator session, and the `argent link` are live
state. Separate EAS jobs get separate workers.

EAS Workflows has no job timeout key, so the 30-minute cap is enforced inside
`scripts/agent/run-agent-pr.sh`. Each phase runs under a watchdog that signals its whole
process tree on expiry, and every exit path — including a killed phase — still commits,
still reports, and still tears the simulator down.

### Lint is measured against a baseline

`src/` currently has nine lint errors that predate this workflow, mostly React
Compiler `react-hooks/*` rules. Blocking on `npm run lint`'s exit code would fail every
run on faults the agent did not cause, so phase 0 records a per-file, per-rule count and
phase 1 compares against it. Only an *increase* is a blocker.

Counts are keyed on file and rule, not line number, because the agent's edits shift
lines. Clear the backlog and this becomes a plain "lint must pass" check on its own.

### Phase 3 in detail

This is the same path as local work, so the CI job **calls
[`scripts/remote-sim.sh`](../../scripts/remote-sim.sh) directly** rather than
reimplementing it. That script resolves the build, starts the session with the dev-server
deep link, and runs `argent link`; `stop` reverses all three.

Order matters. Metro starts **first**, because the session deep-links the dev build at the
tunnel URL on launch — start the simulator first and the app sits on an empty launcher.

The build chosen is the newest unexpired `development-simulator` build whose **runtime
version** matches this working copy. That logic lives in
`scripts/lib/resolve-sim-build.sh`, shared by both callers: a build on a different runtime
crashes at startup when it loads JS from the dev server, and newest-by-date is not enough
to avoid it.

Up to three dialogs stand between a fresh session and a usable app, and nothing in CI taps
any of them:

| Button | Source |
|---|---|
| **Continue** | expo-dev-client's one-time developer-menu explainer on a fresh install |
| **Close** | the developer menu sheet the explainer leaves behind |
| **Open** | an "Open in PK-DEV?" scheme confirmation, when the URL is opened after launch |

In practice a remote session shows only the first two, because EAS passes the deep link at
launch via `--open-url` and never triggers the scheme confirmation. The third appears when
a URL is opened into an already-running app. `sim_clear_startup_prompts` handles either
case: it drains by label, taking coordinates from Argent's accessibility tree — never from
a screenshot — and repeats until a full pass finds nothing, because each dialog only
appears once the previous is gone. The run then confirms
`iOS Bundled` in the Metro log before handing over. Without that confirmation it reports
"the app never loaded from the dev server" rather than letting Claude judge a launcher
screen.

Claude then drives the app through the Argent MCP tools and writes a verdict to
`agent-out/validation.json`. It is told to discover elements before every tap and never
to read coordinates off a screenshot. It cannot edit source files in this phase — it
judges, it does not repair.

### When validation is skipped

Simulator validation is skipped, and the PR left in draft, when:

- **The change alters the native fingerprint.** Every existing development build
  predates the change, so running against one would prove nothing. Build a fresh
  `development-simulator` build and re-apply the label.
- **No unexpired `development-simulator` build matches the current runtime.**
- **Metro, the tunnel, or the simulator session failed to come up.**
- **The app never pulled a bundle** within 180s of the session starting.

Each case says so explicitly in the results block. A skipped validation is never
reported as a pass.

## One-time setup

### 1. Secrets

Add these to the EAS **`development`** environment, all as **secret**:

| Name | Value |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Output of `claude setup-token` |
| `GH_TOKEN` | Fine-grained GitHub PAT, scoped to this repo |
| `EXPO_TOKEN` | Robot access token, so `eas build:list` and `build:download` work on the worker |

```bash
claude setup-token          # then paste into the EAS dashboard
npx eas-cli@latest env:create --environment development --visibility secret
```

The `GH_TOKEN` PAT needs these repository permissions:

- **Contents** — read and write (push the commit)
- **Pull requests** — read and write (update the description, clear draft state)
- **Issues** — read and write (post the blocker comment)

Clearing draft state uses the GraphQL `markPullRequestReadyForReview` mutation. REST's
`PATCH /pulls/{n}` silently ignores a `draft` field, so a token without GraphQL access
to pull requests will update the description and then quietly fail to un-draft.

### 2. GitHub label

Create a label named exactly `agent` on the repository.

### 3. A current development build

Keep one unexpired `development-simulator` build on the current runtime. Without it
every run skips validation.

```bash
npx eas-cli@latest build --platform ios --profile development-simulator
```

EAS expires simulator artifacts after about 30 days.

## Trying it locally

The runner works outside EAS against a real PR, which is the fastest way to exercise the
budget and draft paths:

```bash
GH_TOKEN=ghp_... \
GH_REPO=keith-kurak/pancake-theory \
PR_NUMBER=123 \
PR_HEAD_REF=my-branch \
CLAUDE_CODE_OAUTH_TOKEN=... \
AGENT_TOTAL_BUDGET_SECONDS=600 \
  npm run agent:local
```

It will commit and push to `PR_HEAD_REF` and edit that PR. Point it at a throwaway PR.

## Files

| Path | Purpose |
|---|---|
| `.eas/workflows/agent-pr.yaml` | Trigger, worker, and environment. Thin by design. |
| `scripts/agent/run-agent-pr.sh` | The run: phases, budget, publish. |
| `scripts/agent/lib/budget.sh` | Wall-clock watchdog; signals the whole process group. |
| `scripts/agent/lib/gh.sh` | GitHub REST and GraphQL over `curl`. |
| `scripts/agent/lib/sim.sh` | Tunnelled Metro, remote session, Argent, startup dialogs. |
| `scripts/remote-sim.sh` | Session lifecycle. Shared with local work, called by the job. |
| `scripts/agent/prompts/implement.md` | Implement-phase prompt. |
| `scripts/agent/prompts/validate.md` | Validate-phase prompt. |
| `scripts/lib/resolve-sim-build.sh` | Shared build resolver, also used by `remote-sim.sh`. |

## Security notes

`PR-TODO.md` and the PR body are written by whoever opened the PR. Neither is
interpolated into the workflow YAML or into a shell command. The body is fetched through
the API; the task file is read from disk by Claude, which is told to treat it as a task
description and not as instructions about its own behaviour.

Claude runs with `--permission-mode bypassPermissions`. That is deliberate and it is only
safe because the worker is ephemeral and thrown away at the end of the run. Do not reuse
these scripts anywhere persistent without revisiting that flag.

### Who can start a run

The `agent` label is the authorisation boundary. Applying a label needs **Triage**
permission or higher, so read-only collaborators cannot trigger a run, and neither can an
outside contributor on their own PR. This repository is public but has no triage-only
collaborators today — only accounts that already have push access can label.

Worth knowing if that changes: **Triage can label but cannot push.** Granting someone
triage would hand them an indirect write path, because the run pushes on their behalf
using `GH_TOKEN`.

### Fork pull requests never run

The job requires `head.repo.full_name == github.repository`. A fork PR is skipped even if
it is labelled, because the run would otherwise execute that fork's source and its
`PR-TODO.md` on a worker holding all three secrets. `head.ref` also names a branch that
exists only in the fork, so the push would create a stray branch here instead of updating
the PR.

Do not relax that condition to "validate a contributor's PR". Anyone can open one on a
public repository.
