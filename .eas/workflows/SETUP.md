# Agentic workflow setup

Everything the agent workflows need before their first run. Nothing works until all of
this is in place, and most of it is one-time.

For what the workflows actually *do* once they are running, see
[README.md](README.md).

## Checklist

| # | Step | Where | Repeat? |
|---|---|---|---|
| 1 | Three EAS secrets | EAS `development` environment | Once |
| 2 | One GitHub Actions secret | Repository secrets | Once |
| 3 | Three labels | Repository labels | Once |
| 4 | EAS Hosting activated | expo.dev → Hosting | Once |
| 5 | A current simulator build | EAS Build | Every ~30 days, or after any native change |

---

## 1. EAS secrets

Add these to the EAS **`development`** environment, all with **secret** visibility. That
environment is used because the agent jobs build and run the *development* client.

| Name | What it is for | Where to get it |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Runs Claude on the worker | `claude setup-token` |
| `GH_TOKEN` | Push commits, edit PRs, change draft state, comment | Fine-grained PAT — see below |
| `EXPO_TOKEN` | `eas build:list`, `build:download`, `simulator:start` from inside a job | expo.dev → Account → Access tokens (a robot token is fine) |

```bash
claude setup-token   # copy the output

npx eas-cli@latest env:create --environment development --visibility secret \
  --name CLAUDE_CODE_OAUTH_TOKEN --value '<paste>'
npx eas-cli@latest env:create --environment development --visibility secret \
  --name GH_TOKEN --value 'github_pat_...'
npx eas-cli@latest env:create --environment development --visibility secret \
  --name EXPO_TOKEN --value '<robot token>'
```

### The GitHub PAT

Create a **fine-grained** token scoped to this repository only, with:

| Permission | Access | Needed for |
|---|---|---|
| Contents | Read and write | Pushing the agent's commit to the PR branch |
| Pull requests | Read and write | Rewriting the description, marking ready / draft, removing the trigger label |
| Issues | Read and write | Reading `/agent` and `/verify` comments, posting blockers |

> **Draft state needs GraphQL.** Clearing draft uses the
> `markPullRequestReadyForReview` mutation, because REST's `PATCH /pulls/{n}` silently
> ignores a `draft` field. A token that cannot reach GraphQL for pull requests will update
> the PR description and then quietly fail to un-draft, which looks like the run half
> worked.

The worker's own auto-injected `EXPO_TOKEN` is restricted-scope and cannot create
simulator sessions, which is why an explicit one is required rather than inherited.

## 2. GitHub Actions secret

The issue-to-PR Action runs on GitHub, not EAS, and **cannot read EAS environment
variables**. It needs the same PAT stored again as a repository secret:

```bash
gh secret set AGENT_GH_TOKEN --body 'github_pat_...'
```

Only `.github/workflows/agent-start-from-issue.yml` uses it. The three EAS workflows keep
reading `GH_TOKEN` from EAS.

> **Why not the built-in `GITHUB_TOKEN`?** Events it creates are documented not to start
> new *Actions workflow runs*. GitHub Apps such as EAS are not covered by that wording, so
> it would probably still work — but "probably" is a poor foundation for the whole chain,
> and GitHub recommends a PAT for exactly this case.

## 3. GitHub labels

Three, named exactly. Labels are the trigger for every EAS workflow, because EAS has no
comment trigger.

```bash
gh label create agent-start  --description "Build PR-TODO.md on a draft PR"
gh label create agent-revise --description "Apply /agent review comments"
gh label create agent-verify --description "Prove this PR works on a cloud simulator"
```

| Label | Apply to | Starts |
|---|---|---|
| `agent-start` | an **issue** → the GitHub Action<br>a **draft PR** → `agent-start.yaml` | Build the task in `PR-TODO.md` |
| `agent-revise` | a PR | Apply outstanding `/agent` comments |
| `agent-verify` | a PR | Verify on a simulator, publish evidence |

`agent-start` does double duty on purpose: GitHub labels are repo-wide, and the Action
applies it to the PR it creates, which is what hands off to EAS.

Each workflow **removes its own label** when it finishes, because GitHub only fires
`labeled` on an absent-to-present transition. Labels disappearing on their own is expected,
not a bug.

> **This is the authorisation boundary.** Applying a label needs **Triage** permission or
> higher, so read-only collaborators cannot start a run. Note that triage can label but
> cannot push — granting it hands someone an indirect write path, since runs push using
> `GH_TOKEN`. The issue-comment path is stricter and requires write access outright.

## 4. EAS Hosting

Only the **verify** workflow needs this. It publishes its screenshots as a small static
site and links to it from the PR comment.

This is **not a separate project**. The site deploys to this project's Hosting section,
and `pr-<N>-verify` is an alias on it, so the URL is
`https://<subdomain>--pr-42-verify.expo.app`.

What does need doing once is choosing the project's globally-unique **preview subdomain**.
EAS prompts for it on the first deployment — and the verify job runs `--non-interactive`,
where it cannot be asked. Set it on expo.dev under **Hosting**, or by running one deploy
by hand:

```bash
npx expo export -p web && npx eas-cli@latest deploy
```

> **Already satisfied for this project.** `pancaketheory.expo.app` serves the web build, so
> verify runs can deploy straight away.

If it were missing, a run would still reach a verdict and comment — it would just lose the
evidence link. `verify-pr.sh` recognises that specific failure and says so in the logs
rather than leaving you to guess.

## 5. A current development build

Keep one unexpired `development-simulator` build whose **runtime version** matches the
working copy. Every workflow that drives a simulator resolves one, and without a match
they skip validation rather than testing against the wrong binary.

```bash
npx eas-cli@latest build --platform ios --profile development-simulator
```

Two things expire it:

- **Time.** EAS removes simulator artifacts after about 30 days.
- **Native changes.** A new native module, config plugin, or native key in `app.json`
  changes the fingerprint. `agent-verify` builds a fresh client automatically when nothing
  matches; `agent-start` and `agent-revise` skip validation and say so, leaving the PR in
  draft.

Check what is available:

```bash
npx eas-cli@latest build:list --platform ios --simulator \
  --buildProfile development-simulator --limit 5
```

---

## Verify the setup

Cheapest end-to-end check, in order:

1. **Open a throwaway issue** with a small, concrete task — "add a testID to the home
   screen title".
2. **Comment `/build`.** Within a minute the Action should open a draft PR containing
   `PR-TODO.md` and apply `agent-start`. If nothing happens, look at the Action run: the
   authorisation step is the usual culprit.
3. **Watch the EAS run** on the dashboard. It takes up to 30 minutes.
4. **Expect** a commit on the branch, a results block in the PR description, and the PR
   flipped to ready for review.
5. **Comment `/verify` and label `agent-verify`** on that PR to exercise the Hosting path
   and confirm the evidence link renders.

If a run fails, it says why in the PR — the failure paths are deliberate, not silent. The
most common first-run problems are a missing secret (caught in preflight, before anything
is touched) and no matching `development-simulator` build (step 5 above).

## Running it locally

The runner works outside EAS against a real PR, which is the fastest way to exercise the
budget and draft paths without waiting on CI:

```bash
GH_TOKEN=ghp_... \
GH_REPO=keith-kurak/pancake-theory \
PR_NUMBER=123 \
PR_HEAD_REF=my-branch \
CLAUDE_CODE_OAUTH_TOKEN=... \
AGENT_MODE=build \
AGENT_TOTAL_BUDGET_SECONDS=600 \
  bun run agent:local
```

Set `AGENT_MODE=revise` for the comment path. Leave `AGENT_LABEL` unset so it does not
strip a label off a real PR. It **will** commit and push to `PR_HEAD_REF` and edit that
PR — point it at a throwaway.
