# EAS Workflows

Automation for this app. Everything runs on EAS except one small GitHub Action, which
exists because EAS has no issue or comment trigger — see [From an issue](#from-an-issue).

## The agent chain

```
issue  --/build-->  draft PR + PR-TODO.md  --agent-start-->  built & validated
                              ^                                     |
                              |                                     v
                       /agent + agent-revise  <-----------  ready for review
                                                                    |
                                                     /verify + agent-verify
                                                                    v
                                                      verdict + evidence site
```

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/.../agent-start-from-issue.yml` | `/build` comment or `agent-start` label **on an issue** | Opens a draft PR carrying `PR-TODO.md`, then labels it to hand off to EAS |
| `agent-start.yaml` | `agent-start` label on a draft PR | Implements `PR-TODO.md`, validates on a simulator, commits, flips the PR to ready |
| `agent-revise.yaml` | `agent-revise` label on any PR | Applies `/agent` review comments, re-validates, commits |
| `agent-verify.yaml` | `agent-verify` label on any PR | Proves a PR works on a cloud simulator and publishes a screenshot evidence site. Writes no code |
| `update-on-pr.yaml` | Any **non-draft** PR | Unit tests, then publishes a preview update and comments on the PR |
| `maybe-make-dev-builds-on-pr.yaml` | Any **non-draft** PR | Builds development clients when the fingerprint changed |
| `build-or-update-preview.yaml` | Push to `main` | Publishes an update, or builds when the fingerprint changed |
| `build-or-repack-preview.yaml` | Push to `main` | Builds or repacks preview binaries |
| `build-or-repack-then-maestro.yaml` | Push to `main` | The above, then Maestro E2E on iOS and Android |
| `observe-events-test.yaml` | Daily at 04:00 GMT | Maestro run that checks `expo-observe` events |
| `store-screenshots.yaml` | Manual | Captures App Store / Play screenshots |
| `build-production.yaml` | Manual | Production builds and store submissions |

---

# Agent Start

Describe a feature or fix once, in a file. Get back a validated PR.

## From an issue

The usual way in. On any issue, comment:

```
/build focus on the Ratios tab only
```

Or apply the **`agent-start`** label to the issue. Either opens a draft PR whose
`PR-TODO.md` is built from the issue title and body, plus anything you wrote after
`/build`, and labels that PR so the EAS run starts.

This one step is a **GitHub Action**
([`.github/workflows/agent-start-from-issue.yml`](../../.github/workflows/agent-start-from-issue.yml)),
not an EAS workflow, and it has to be: EAS has no issue trigger and no comment trigger.
Actions has both — which is why `/build` works directly here while `/agent` and `/verify`
still need a label to fire.

Three details in that Action are load-bearing:

- **Write access is required**, checked against
  `GET /repos/{repo}/collaborators/{user}/permission`. On a *public* repository this
  endpoint returns `read` for any GitHub user rather than 404, so the check matches on
  the permission **value** — `admin`, `maintain`, or `write`. Anything else, including an
  error body or an empty response, falls through to a refusal.
- **The label is applied after the PR is created**, never at creation time. A PR opened
  with labels already attached emits `opened` with the labels set and *no* separate
  `labeled` event, so EAS would never see the trigger it listens for.
- **It pushes with a PAT, not `GITHUB_TOKEN`.** Events made by `GITHUB_TOKEN` are
  documented not to start new *Actions workflow runs*; GitHub Apps such as EAS are not
  covered by that wording, so it would probably work. "Probably" is a poor foundation for
  the whole chain, and GitHub recommends a PAT for exactly this case.

Issue text never reaches a shell command — it is passed through the environment into
Python, which writes the file. A title containing `` $(whoami) `` lands in `PR-TODO.md`
as literal text.

### Draft PRs cost one workflow, not three

Opening a PR also fires `update-on-pr.yaml` and `maybe-make-dev-builds-on-pr.yaml` —
including for draft PRs, which is what an agent run starts as. That meant one `/build`
kicked off three EAS workflows, one of which could be a full native build on a branch
whose only content was a markdown file.

Both are now gated with `if: ${{ !github.event.pull_request.draft }}`, so they hold until
the PR is genuinely ready for review — which is also when their output starts being
useful.

That guard needs a matching trigger change, or it would silently do too much. `types`
defaults to `opened, reopened, synchronize`, and **`ready_for_review` is not in that
set**. With the guard but not the extra type, a PR opened as a draft would never run them
at all — not even after being marked ready — because no event would fire once the guard
started passing. Both files now list `ready_for_review` explicitly.

In `maybe-make-dev-builds-on-pr.yaml` only the root `fingerprint` job carries the guard.
Every other job reaches it through `needs`, and a skipped job stops its dependents, so the
three build jobs keep their own unrelated `if` conditions untouched.

## By hand

If you would rather skip the issue:

1. Branch, and add a `PR-TODO.md` at the repository root. Copy
   [`PR-TODO.template.md`](../../PR-TODO.template.md) and fill it in.
2. Open a **draft** pull request.
3. Add the **`agent-start`** label.

The run takes up to 30 minutes. Watch it on the EAS dashboard.

**Passing run** — the code is committed to your branch, the PR description gains a
results block, and the PR is flipped to *ready for review*.

**Failing run** — the code is still committed, the results block explains what went
wrong, a comment lists the blockers, and the PR **stays in draft**. Fix the task
description, then apply the label again. The results block is replaced, not appended,
so repeat runs stay readable.

Labelling a PR that is already out of draft does nothing. That guard exists so a run
cannot rewrite a branch under a reviewer — to change an open PR, use **Agent Revise**
below.

---

# Agent Revise

Ask for changes in review. Get them applied and re-validated.

## How to use it

1. Comment on the PR, starting the comment with **`/agent`**:

   ```
   /agent the Flour label should be bold, and it should read "Flour (cups)"
   ```

   Inline comments on a diff line work too, and are better when the request is about
   specific code — the agent is told which file and line the comment was attached to.

2. Add the **`agent-revise`** label.

Leave as many `/agent` comments as you like before labelling. They are applied together,
oldest first.

**Passing run** — the changes are committed, the results block is updated, and the PR
stays open for review with a short comment.

**Failing run** — the changes are still committed, and the PR is moved **back to draft**.
"Ready for review" should always mean "validated", so an open PR is never left showing
unvalidated code.

## Why a label and not just a comment

EAS Workflows has no comment trigger. The complete list is `workflow_dispatch`, `push`,
`ref_delete`, `pull_request`, `pull_request_labeled`, `app_store_connect`, and
`schedule`. A comment cannot start a run, so the two roles are split: **the comment is
the payload, the label is the trigger.**

That split earns its keep anyway. You can discuss freely in the same thread and only the
`/agent` comments are treated as instructions, and you decide when a batch of feedback is
complete rather than firing a run per comment.

**Both workflows remove their own label when they finish.** GitHub only fires `labeled`
on an absent-to-present transition, so without that, re-applying a label already on the
PR would silently do nothing.

## Which comments count

A comment is picked up only when all three hold:

| Filter | Why |
|---|---|
| Starts with `/agent` | Ordinary discussion in the thread is not an instruction |
| Author is OWNER, MEMBER, or COLLABORATOR | This repository is public and anyone can comment. Without this filter, a stranger's comment would become agent instructions |
| Newer than the last commit on the branch | Anything older was already acted on, or predates the code now on the branch |

The requests a run acted on are listed by author in the results block, so it is never
ambiguous which comments were picked up and which were ignored.

The revise prompt is deliberately narrower than the build prompt: do what was asked and
nothing else, apply the later of two conflicting requests, and leave a vague request
alone rather than guessing. A wrong change costs a reviewer more than no change.

---

# Agent Verify

Prove a PR works on a real device, and get a link to the screenshots.

This one **writes no code and pushes no commits**. It answers "does this actually work?"
and reports, so it is safe to point at a PR a human wrote.

## How to use it

1. Comment on the PR, starting with **`/verify`**. Guidance is optional but helps:

   ```
   /verify check that the Eggs slider still snaps to whole numbers
   ```

2. Add the **`agent-verify`** label.

You get a PR comment with a verdict — `PASS`, `FAIL`, or `INCONCLUSIVE` — a link to a
published evidence page of screenshots, and a collapsible full report. A `FAIL` or
`INCONCLUSIVE` verdict fails the job, so the check goes red on the PR.

Only the **most recent** `/verify` comment is used as guidance, unlike Agent Revise which
batches every outstanding request. A verification is one question, asked now.

## Screenshots without bloating the repo

The evidence page is deployed to **EAS Hosting** under a per-PR alias
(`pr-<N>-verify`), and the comment links to it.

That solves a problem worth naming: GitHub markdown only renders images from
publicly-reachable URLs, and EAS **artifact** links sit behind expo.dev auth, so they
render as broken images. The alternative — committing PNGs so a raw URL exists — puts
binaries in your diffs and in the repo's object store permanently. Hosting the page
instead costs nothing per run and keeps git clean.

`build-evidence-site.mjs` copies **only media** into `site/`. The prompt, the diff, the
transcript, and the argent config stay behind — that config holds a session bearer token
and the site is public. Every string that reaches the page is HTML-escaped, because the
verdict text is written by a model that has just read an untrusted PR diff.

Screenshot filenames drive the page: `2-ratios-adjusted.png` becomes item 2, captioned
"Ratios adjusted".

## How the PR's code reaches the simulator

This is the part that differs most from the other two workflows, and it is why this one
is faster: **no Metro and no tunnel.**

| Piece | Where it comes from |
|---|---|
| The binary | A fingerprint-matched `development-simulator` build, reused across PRs. Built only when no build matches |
| The JavaScript | An EAS Update published from the PR branch, per run |

The job then deep-links the build at that one update group:

```
pancaketheory://expo-development-client/?url=https://u.expo.dev/<project-id>/group/<group-id>
```

That URL is the mechanism that makes this work. `update-on-pr.yaml` publishes to a branch
named after the PR branch, which a `preview`-channel build would never resolve to — and
pointing the shared `preview` channel at a PR branch would break previews for everyone
else. The deep link sidesteps both: it loads exactly that update and nothing else.

A native change means no build matches the fingerprint, so a fresh
`development-simulator` build runs first. That makes the run long rather than making it
lie.

## Failure behaviour

The session bills until stopped, and a run that dies before commenting would leave the PR
silent. An `EXIT` trap covers both, and it reports honestly: a verdict that was reached is
posted even if a later step (deploy, comment) failed.

Two backstops sit under the verifier. A **deterministic floor** — if the app produced no
accessibility tree at launch, the run fails without asking Claude, because the update
clearly did not load. And a **hard timeout**: the verdict file is the contract, not
Claude's exit code, so a hung agent is killed, leaves no verdict, and the run fails
closed rather than reporting a pass nobody proved.

---

## What a build or revise run actually does

Agent Start and Agent Revise share `scripts/agent/run-agent-pr.sh`, switched by
`AGENT_MODE`. Only the source of the task and the prompt differ; the checks, the
fingerprint gate, the simulator validation, and the publish step are identical. Agent
Verify is a separate script — it has no implement phase and never touches the branch.

| Phase | Budget | Detail |
|---|---|---|
| 0. Preflight | ~1 min | Check secrets, read the task, record the iOS fingerprint |
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

### 2. A GitHub Actions secret

The issue-to-PR Action needs the same PAT as `GH_TOKEN`, stored on the **repository**
rather than in EAS, because Actions cannot read EAS environment variables:

```bash
gh secret set AGENT_GH_TOKEN --body 'github_pat_...'
```

Only this one Action uses it. The three EAS workflows read `GH_TOKEN` from the EAS
`development` environment as before.

### 3. GitHub labels

Create two labels on the repository, named exactly:

```bash
gh label create agent-start  --description "Build PR-TODO.md on a draft PR"
gh label create agent-revise --description "Apply /agent review comments"
gh label create agent-verify --description "Prove this PR works on a cloud simulator"
```

Applying a label needs **Triage** permission or higher, so this is the authorisation
boundary for both workflows. See [Who can start a run](#who-can-start-a-run).

### 4. EAS Hosting activated

The evidence site is **not** a separate project — it deploys to this project's Hosting
section, and `pr-<N>-verify` is an alias on it. So the URL is
`https://<subdomain>--pr-42-verify.expo.app`.

What does need doing once is choosing the project's globally-unique **preview
subdomain**. EAS normally prompts for it on the first deployment, and the verify job runs
`--non-interactive`, where it cannot be asked. Set it on expo.dev under **Hosting**, or by
running one deploy interactively.

**Already done for this project** — `pancaketheory.expo.app` serves the web build, so
verify runs can deploy straight away.

If it were missing, a run would still produce a verdict and comment; it would just lose
the evidence link. The script recognises that specific failure and says so in the logs
rather than leaving you guessing.

### 5. A current development build

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
AGENT_MODE=build \
AGENT_TOTAL_BUDGET_SECONDS=600 \
  npm run agent:local
```

Set `AGENT_MODE=revise` to exercise the comment path instead. Leave `AGENT_LABEL` unset
locally so the script does not strip a label off a real PR.

It will commit and push to `PR_HEAD_REF` and edit that PR. Point it at a throwaway PR.

## Files

| Path | Purpose |
|---|---|
| `.eas/workflows/agent-start.yaml` | Build trigger, worker, environment. Thin by design. |
| `.eas/workflows/agent-revise.yaml` | Revise trigger. Same job, `AGENT_MODE=revise`. |
| `scripts/agent/run-agent-pr.sh` | The run: phases, budget, publish. Both modes. |
| `scripts/agent/lib/budget.sh` | Wall-clock watchdog; signals the whole process group. |
| `scripts/agent/lib/gh.sh` | GitHub REST and GraphQL over `curl`. |
| `scripts/agent/lib/sim.sh` | Tunnelled Metro, remote session, Argent, startup dialogs. |
| `scripts/remote-sim.sh` | Session lifecycle. Shared with local work, called by the job. |
| `.eas/workflows/agent-verify.yaml` | Verify trigger, plus the build and update jobs it needs. |
| `scripts/agent/verify-pr.sh` | The verification run. Separate: no implement phase. |
| `scripts/agent/build-evidence-site.mjs` | Screenshots to a static page for EAS Hosting. |
| `scripts/agent/prompts/implement.md` | Build-mode prompt. |
| `scripts/agent/prompts/revise.md` | Revise-mode prompt. Narrower on purpose. |
| `scripts/agent/prompts/validate.md` | Validate-phase prompt, shared by build and revise. |
| `scripts/agent/prompts/verify.md` | Verifier prompt. Judges, never edits. |
| `scripts/lib/resolve-sim-build.sh` | Shared build resolver, also used by `remote-sim.sh`. |

## Security notes

`PR-TODO.md`, the PR body, and every `/agent` comment are user-written. None is
interpolated into the workflow YAML or into a shell command. Bodies and comments are
fetched through the API and written to files; Claude reads them as files and is told to
treat them as task descriptions, not as instructions about its own behaviour.

Comments carry the extra risk that anyone can leave one on a public repository, so
`gh_collect_requests` drops any whose `author_association` is not OWNER, MEMBER, or
COLLABORATOR before they ever reach the prompt.

Claude runs with `--permission-mode bypassPermissions`. That is deliberate and it is only
safe because the worker is ephemeral and thrown away at the end of the run. Do not reuse
these scripts anywhere persistent without revisiting that flag.

### Who can start a run

The `agent-start`, `agent-revise`, and `agent-verify` labels are the authorisation boundary.
Applying a label
needs **Triage** permission or higher, so read-only collaborators cannot trigger a run,
and neither can an outside contributor on their own PR. This repository is public but has
no triage-only collaborators today — only accounts that already have push access can
label.

Worth knowing if that changes: **Triage can label but cannot push.** Granting someone
triage would hand them an indirect write path, because the run pushes on their behalf
using `GH_TOKEN`.

The two entry points are not gated identically, which matters only once a triage-only
collaborator exists:

| Entry point | Requires |
|---|---|
| `/build` or `agent-start` on an **issue** | `write`, `maintain`, or `admin` |
| Any label on a **PR** | Triage or higher, since that is what labelling needs |

The Action is the stricter of the two. To make the label path match, add the same
permission check to the start of `run-agent-pr.sh` and `verify-pr.sh` using
`github.triggering_actor`.

### Fork pull requests never run

All three workflows require `head.repo.full_name == github.repository`. A fork PR is
skipped even if
it is labelled, because the run would otherwise execute that fork's source and its
`PR-TODO.md` on a worker holding all three secrets. `head.ref` also names a branch that
exists only in the fork, so the push would create a stray branch here instead of updating
the PR.

Do not relax that condition to "validate a contributor's PR". Anyone can open one on a
public repository.
