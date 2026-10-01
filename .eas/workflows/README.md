# EAS Workflows

Automation for this app. Everything runs on EAS except one small GitHub Action, which
exists because EAS has no issue trigger — see [From an issue](#from-an-issue).

## The agent chain

```
issue --agent-start--> draft PR (task = description) --agent-start--> plan, build, validate
                               ^                                      |
                               |                                      v
                               |                        independent verify (adversarial)
                               |                          |                    |
                               |                        FAIL                  PASS
                               |                          v                    v
                        /agent + agent-revise <---- stays in draft     ready for review
```

## One command, and the label picks the activity

Every instruction to an agent is a comment that starts with **`/agent`**. The label you
then add decides what happens with those comments:

| Label | Apply to | `/agent` comments are |
|---|---|---|
| `agent-start` | an issue | Extra guidance, added to the PR description |
| `agent-start` | a draft PR | Extra guidance for the build |
| `agent-revise` | any PR | The changes to make |
| `agent-verify` | any PR | What the verifier must check |

Comments count only when the author is OWNER, MEMBER, or COLLABORATOR. See
[Which comments count](#which-comments-count).

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/.../agent-start-from-issue.yml` | `agent-start` label **on an issue** | Opens a draft PR with the task as its description, then labels it to hand off to EAS |
| `agent-start.yaml` | `agent-start` label on a draft PR | Writes a plan into the PR description, implements it, validates on a simulator, commits, then runs the verify function. Its PASS flips the PR to ready |
| `agent-revise.yaml` | `agent-revise` label on any PR | Applies `/agent` review comments, re-validates, commits, then runs the verify function |
| `agent-verify.yaml` | `agent-verify` label on any PR | Runs the verify function alone: proves a PR works on a cloud simulator and publishes a screenshot evidence site. Writes no code |
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

The usual way in. First, the issue **description** must have a user story and fit
criteria. The **Feature or fix** issue template
([`.github/ISSUE_TEMPLATE/agent-task.md`](../../.github/ISSUE_TEMPLATE/agent-task.md))
starts you with both:

```markdown
## User story

As a baker, I want cook times in whole minutes, so that the history list is easy to scan.

## Fit criteria

- The history list shows "12 min", not "12:34".
- Editing a cook time shows a minutes field only.
```

When the label is applied, the Action runs
[`scripts/agent/check-story.py`](../../scripts/agent/check-story.py) before it creates
anything. If a part is missing, it comments on the issue with what to fix, removes the
label, and fails. No branch, no PR, no EAS run. The rules:

| Rule | Why |
|---|---|
| A heading, at any level, containing "User story" | So the check finds the story in any issue layout |
| Under it, "As a …, I want …, so that …" | All three parts. "So that" is the one most often dropped, and it says why the work matters |
| A heading containing "Fit criteria" | The same, for the criteria |
| Under it, at least one `-` or numbered item | Each criterion is one observable result |
| No template placeholders such as `<who>` | An unedited template is not a story |
| Only the description counts | Headings inside code blocks and `/agent` comments are ignored |

The fit criteria then travel with the task into the PR description. The implement
phase must cover each one in its validation plan, the validate phase fails a missed
one, and the verifier treats each one as a requirement.

Optionally, steer the build with a comment on the issue:

```
/agent focus on the Ratios tab only
```

Then apply the **`agent-start`** label to the issue. That opens a draft PR whose
description is built from the issue body, plus every trusted `/agent` comment on the
issue, and labels that PR so the EAS run starts.

If an open PR for the issue already exists, the Action only labels it again. It does not
rewrite a description that runs have already written into. To change the task then, edit
the PR description or comment `/agent` on the PR.

This one step is a **GitHub Action**
([`.github/workflows/agent-start-from-issue.yml`](../../.github/workflows/agent-start-from-issue.yml)),
not an EAS workflow, and it has to be: EAS has no issue trigger. Its comment trigger
covers pull requests only.

A comment on its own starts nothing, on an issue or a PR. That used to differ — an issue
accepted a `/build` comment as a trigger — but one rule is easier to remember than three
commands.

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
Python, which writes the PR description to a file for `gh pr create --body-file`. A title
containing `` $(whoami) `` lands in the description as literal text.

## The task lives in the PR description

There is no task file in the repository. That used to be `PR-TODO.md`, and it was
merged into `main` with every agent PR.

GitHub will not open a pull request with no diff, so the Action commits one placeholder,
`.agent-placeholder`. It holds one line and no task. The agent run deletes it in the
same commit as its first real change, so it never reaches `main`. A run that changes
nothing leaves it in place, so the PR still has a diff and stays open.

The description is shared between people and runs, in fixed places:

| Part | Written by | Changed by |
|---|---|---|
| Everything outside the marked blocks | the issue Action, or you | only a human |
| `<!-- agent-plan:start -->` … `end` | a build run, before it changes code | the next build run |
| `<!-- agent-results:start -->` … `end` | every run | the next run |

The task is the description with both blocks removed (`gh_task_from_body`). The
verifier gets the task as intent and the two blocks as claims, in separate files, which
is what lets it plan before it reads what the author says.

A revise run does not rewrite the plan. It reports its own changes in the results block.

### Draft PRs cost one workflow, not three

Opening a PR also fires `update-on-pr.yaml` and `maybe-make-dev-builds-on-pr.yaml` —
including for draft PRs, which is what an agent run starts as. That meant one issue
label kicked off three EAS workflows, one of which could be a full native build on a branch
whose only content was a placeholder file.

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

1. Open a **draft** pull request. It needs at least one commit; any small change will do.
   If you add `.agent-placeholder`, the run deletes it for you.
2. Write the task in the PR description:
   - **What to build** — what a user should be able to do that they cannot do today, or
     what is broken.
   - **Where** — screens, routes, or components, if you know them.
   - **How to tell it works** — concrete steps in the running app and what to see. The
     agent drives a real simulator against these.
   - **Out of scope** — anything nearby to leave alone.

   Keep it to one feature or one fix, and prefer JavaScript-only work. A native change
   makes the run skip simulator validation.
3. Add the **`agent-start`** label.

The run takes up to 30 minutes. Watch it on the EAS dashboard.

**Passing run** — the code is committed to your branch and the PR description gains a
plan block and a results block. The [verify function](#agent-verify) then runs against the pushed commit.
Its `PASS` flips the PR to *ready for review*. Any other verdict leaves it in draft, with
the findings in a comment.

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

**Passing run** — the changes are committed and the results block is updated. The
verify function then checks the same `/agent` requests independently. `PASS` keeps the
PR open for review. Any other verdict moves it back to draft.

**Failing run** — the changes are still committed, and the PR is moved **back to draft**.
"Ready for review" should always mean "validated", so an open PR is never left showing
unvalidated code.

## Why a label and not just a comment

EAS Workflows now has a `pull_request_comment` trigger, so a comment *could* start a run.
The label stays the trigger on purpose: **the comment is the payload, the label is the
trigger.**

- **One command.** With comment triggers, each activity needs its own command word. With
  labels, `/agent` means the same thing everywhere and the label picks the activity.
- **Batches.** You can leave several `/agent` comments, discuss freely in the same
  thread, and start one run when the feedback is complete, not one run per comment.
- **Authorisation.** Applying a label needs Triage or higher. A comment trigger would
  need its own author check before any worker starts.

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

The same filters apply for every label. The only difference is what the run does with
the comments. The verify step that follows a revise run reads from the same boundary
the revise run used, so it checks the requests that were just applied, even though the
revise commit is now newer than them.

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

It is an EAS **custom function**,
[`.eas/functions/agent-verify`](../functions/agent-verify/function.yml), not only a
workflow. `agent-verify.yaml` calls it on its own. `agent-start.yaml` and
`agent-revise.yaml` call it as their last job, so every passing agent run gets an
independent check with screenshots.

## How to use it

1. Optionally, comment on the PR, starting with **`/agent`**, to say what to check:

   ```
   /agent check that the Eggs slider still snaps to whole numbers
   ```

2. Add the **`agent-verify`** label.

You get a PR comment with a verdict — `PASS`, `FAIL`, or `INCONCLUSIVE` — a link to a
published evidence page of screenshots, and a collapsible full report. A `FAIL` or
`INCONCLUSIVE` verdict fails the job, so the check goes red on the PR.

Every trusted `/agent` comment newer than the branch's last commit is guidance, oldest
first, the same set Agent Revise would pick up.

## The verifier is adversarial

The implementing agent already validated its own work, from its own test plan, after
reading its own summary. Repeating that check adds little. The verifier prompt
([`prompts/verify.md`](../../scripts/agent/prompts/verify.md)) is built to find what that
check missed:

- **Intent before claims.** The job gives the verifier the task and the `/agent` requests
  in separate files from the PR description, which holds the author's claims. The
  verifier must write its own test plan, with at least three attacks, *before* it reads
  the claims. The plan is in the report, so you can see it came first.
- **Assume broken.** A requirement is met only when it was observed on screen. The
  prompt lists attacks to pick from: edge values, persistence across a restart,
  neighbouring screens the diff touches, the reverse path, and unrequested changes.
- **Lean red.** A cosmetic nit that nobody asked about is a finding, not a `FAIL`. But
  when the verifier is unsure between the two, it chooses `FAIL`.
- **Infrastructure is not evidence.** If no build matches, the update does not publish,
  or the session does not start, the verdict is `INCONCLUSIVE`, never `FAIL`.

## Screenshots without bloating the repo

All three workflows publish one. `agent-start` and `agent-revise` already drove the app
and captured screenshots during their validate phase — those were previously only
reachable by downloading the run's tarball. They now go to
`pr-<N>-agent`, and verify's to `pr-<N>-verify`, so the two never clobber each other.


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

## Why verify runs after every passing agent run

This used to be a manual step, for three reasons. Each now has an answer:

- **"It re-tests the same change."** It does not, now. The validate phase checks the
  author's own plan against a Metro bundle. The verifier plans from the intent alone,
  tries to break the change, and loads the published update. It is a second opinion,
  not a repeat.
- **"It roughly doubles the cost."** Still true: another simulator session and another
  Claude run. It runs only after the agent's own validation passed, because a failing
  run already reports its blockers and screenshots. A native change stops the agent run
  before validation, so it never reaches a verify job that has no build to run.
- **"The states fight."** Solved by giving one job the decision. With
  `AGENT_VERIFY_FOLLOWS=1`, the agent job never marks the PR ready. The verify job does,
  on `PASS` only. On any other verdict it keeps the PR in draft, or moves an open PR
  back to draft. The PR changes state once per run.

The chained call passes `gate_ready: true`. A standalone `agent-verify` run leaves it
false, so verifying a human's PR only comments. It never changes draft state.

### Why the chained verify cannot use the pre-packaged jobs

`agent-verify.yaml` uses the `fingerprint`, `get-build`, and `build` pre-packaged jobs.
They have no `ref` parameter and always use the commit that triggered the workflow. In
`agent-verify.yaml` that is correct, because nothing pushes during the run.

In `agent-start.yaml` and `agent-revise.yaml` the agent pushes a new commit mid-run. The
pre-packaged jobs would publish and test the commit *before* the agent's change. So the
verify function does that work itself, in a custom job whose `eas/checkout` takes the
branch head:

- It publishes the checkout with `eas update --branch <pr-branch> --platform ios`.
- When no `build_id` input is given, it resolves the build with
  `scripts/lib/resolve-sim-build.sh`, the resolver the validate phase uses.

## How the PR's code reaches the simulator

This is the part that differs most from the other two workflows, and it is why this one
is faster: **no Metro and no tunnel.**

| Piece | Where it comes from |
|---|---|
| The binary | Standalone: a fingerprint-matched `development-simulator` build, built only when none matches. Chained: the runtime-matched build the validate phase used |
| The JavaScript | An EAS Update the verify function publishes from the checked-out branch, per run |

The job then deep-links the build at that one update group:

```
pancaketheory://expo-development-client/?url=https://u.expo.dev/<project-id>/group/<group-id>
```

That URL is the mechanism that makes this work. `update-on-pr.yaml` publishes to a branch
named after the PR branch, which a `preview`-channel build would never resolve to — and
pointing the shared `preview` channel at a PR branch would break previews for everyone
else. The deep link sidesteps both: it loads exactly that update and nothing else.

In a standalone run, a native change means no build matches the fingerprint, so a fresh
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
fingerprint gate, the simulator validation, and the publish step are identical. The
verify job that follows is a separate job and script — it has no implement phase and
never touches the branch.

| Phase | Budget | Detail |
|---|---|---|
| 0. Preflight | ~1 min | Check secrets, read the task, record the iOS fingerprint |
| 1. Implement | 15 min | Claude writes the code, then lint and `bun test` |
| 2. Gate | seconds | Recompute the fingerprint |
| 3. Validate | 10 min | Publish Metro over a tunnel, start a remote EAS Simulator on it, drive the app |
| 4. Publish | 4 min | Commit, push, rewrite the PR description. Draft state is left to the verify job |

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
Compiler `react-hooks/*` rules. Blocking on `bun run lint`'s exit code would fail every
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

Secrets, labels, EAS Hosting, and the simulator build prerequisite all live in
**[SETUP.md](SETUP.md)**. Nothing here runs until those are in place.

## Trying it locally

The runner works outside EAS against a real PR — see
[Running it locally](SETUP.md#running-it-locally).

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
| `.eas/workflows/agent-verify.yaml` | Verify trigger, plus the fingerprint and build jobs for a standalone run. |
| `.eas/functions/agent-verify/function.yml` | The verify custom function. Called by all three agent workflows. |
| `scripts/agent/verify-pr.sh` | The verification run: publish, boot, verify, report, draft gate. |
| `scripts/agent/build-evidence-site.mjs` | Screenshots to a static page for EAS Hosting. |
| `scripts/agent/prompts/implement.md` | Build-mode prompt. |
| `scripts/agent/prompts/revise.md` | Revise-mode prompt. Narrower on purpose. |
| `scripts/agent/prompts/validate.md` | Validate-phase prompt, shared by build and revise. |
| `scripts/agent/prompts/verify.md` | Adversarial verifier prompt. Judges, never edits. |
| `scripts/lib/resolve-sim-build.sh` | Shared build resolver, also used by `remote-sim.sh`. |
| `scripts/agent/check-story.py` | Issue readiness check: user story and fit criteria. |
| `.github/ISSUE_TEMPLATE/agent-task.md` | Issue template with both sections. |

## Security notes

The PR description and every `/agent` comment are user-written. None is
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
| `agent-start` on an **issue** | `write`, `maintain`, or `admin` |
| Any label on a **PR** | Triage or higher, since that is what labelling needs |

The Action is the stricter of the two. To make the label path match, add the same
permission check to the start of `run-agent-pr.sh` and `verify-pr.sh` using
`github.triggering_actor`.

### Fork pull requests never run

**EAS enforces this, and these workflows do not.** The GitHub pull-request webhook
handler compares `pull_request.head.repo.id` against the webhook's `repository.id` and
returns without dispatching when they differ, so a fork PR never produces a run at all.
That is the right layer: it stops before any worker exists, whereas anything written here
could only react after one had already started.

> **Do not re-add a same-repo `if` to these workflows.** The obvious form,
> `if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}`, is not
> just redundant — it silently breaks everything. EAS's `github` context documents
> `pull_request` with `number`, `title`, `body`, `state`, `draft`, and `merged`, but not
> `head.repo`. The expression evaluates `undefined == "owner/repo"` → false, so *every*
> run is skipped, legitimate ones included, and the only trace is "if condition not met"
> with no worker to inspect. This repo shipped that bug; it is why the guard is gone
> rather than merely simplified.

`github.repository` and `github.repository_owner` cannot substitute: both describe the
*base* repository and are identical for fork and same-repo PRs.

One thing to revisit — EAS has follow-up work to let maintainers approve one-off
workflows for fork PRs. If that lands, approving one here would run a fork's code on a
worker holding all three secrets, and `head.ref` names a branch that exists only in the
fork, so the push would create a stray branch rather than update the PR. Treat such an
approval as a deliberate, considered act rather than a convenience.
