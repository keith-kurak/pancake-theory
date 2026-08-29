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
| `EXPO_TOKEN_SIMULATOR` | `eas simulator:start`, `build:list`, `build:download` | expo.dev → Account → Access tokens. Must be a **personal** token — see below |

```bash
claude setup-token   # copy the output

npx eas-cli@latest env:create --environment development --visibility secret \
  --name CLAUDE_CODE_OAUTH_TOKEN --value '<paste>'
npx eas-cli@latest env:create --environment development --visibility secret \
  --name GH_TOKEN --value 'github_pat_...'
npx eas-cli@latest env:create --environment development --visibility secret \
  --name EXPO_TOKEN_SIMULATOR --value '<personal access token>'
```

> **This one cannot be a robot token, and cannot be named `EXPO_TOKEN`.**
> Simulator sessions are **actor-gated**: the restricted `EXPO_TOKEN` that EAS injects
> into every job cannot create one. And a secret named `EXPO_TOKEN` is shadowed by that
> injected value, which is why it is passed under a different name and re-exported by
> `scripts/agent/lib/sim.sh`.
>
> This is **not in Expo's public documentation** — it comes from Expo's internal
> expo-bot verification workflow, which hit the same wall. Worth re-testing if the docs
> ever cover CI simulator sessions.

**Separately, the account needs EAS Simulator enabled.** It is a gated feature, and the
failure looks nothing like a credentials problem:

```
EAS Simulator isn't available on <account> yet — it's coming soon.
Join the waitlist to get access: https://expo.dev/services/simulators
```

That message is about the **account**, not the token. Adding credentials will not fix it,
and a token problem surfaces as an authorization error instead. Two different failures
that are easy to conflate.

### Which account posts

Everything the agent writes — comments, the PR description, and the commits — is
attributed to **whoever owns `GH_TOKEN`**. A comment's author *is* the token holder;
there is no display-name override.

So use a **machine user**. Create a GitHub account (`llamabot`), add it to the repository
as a collaborator with **write** access, and generate the PAT from that account. Nothing
in the code names it — both runners call `GET /user` and derive the identity, so changing
bots later means swapping the secret and nothing else.

Commits use GitHub's `<id>+<login>@users.noreply.github.com` address, which is the form
that links a commit back to a profile. A bare name with an unmatched noreply address
renders as plain text with no avatar.

Use the **same** PAT for `AGENT_GH_TOKEN` (step 2), so the issue-to-PR Action posts under
the same name.

> **The bot is a collaborator, so it can instruct itself.** Its comments pass the
> `author_association` filter like any other collaborator's. Both comment readers
> therefore skip anything authored by the token's own account, so an agent comment
> starting with `/agent` can never be read back as a change request.

### The GitHub PAT

Create a **fine-grained** token scoped to this repository only, owned by the machine
user, with:

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
