#!/usr/bin/env bash
#
# Try to reproduce a GitHub bug report on an EAS cloud simulator, and post the
# verdict on the issue.
#
# The body of agent-reproduce.yaml, which .github/workflows/agent-reproduce-from-issue.yml
# starts when the `agent-reproduce` label is applied to an issue.
#
# Publishes the checkout (the default branch) as an EAS Update, boots a
# fingerprint-matched development build deep-linked at exactly that update,
# lets Claude follow the issue's steps on the real app and capture screenshots
# into evidence/, deploys those to EAS Hosting, and comments the verdict on the
# issue with links to the evidence page and the simulator session.
#
# Read-only with respect to the repository. It writes no code and pushes no
# commits.
#
# Usage:    reproduce-issue.sh             run the reproduction
#           reproduce-issue.sh --announce  only comment that a run started
#
# Required: ISSUE_NUMBER, GH_REPO, GH_TOKEN, EXPO_TOKEN_SIMULATOR,
#           CLAUDE_CODE_OAUTH_TOKEN (only the first three for --announce)
# Optional: REPRO_BUILD_ID   build to use; resolved by runtime when empty
#           UPDATE_GROUP_ID  update to load; published from the checkout when empty
#           RUN_URL          the EAS workflow run, linked from the comment
#
# Local dry run (comments on the issue for real — point it at a throwaway):
#   GH_TOKEN=... GH_REPO=owner/name ISSUE_NUMBER=123 EXPO_TOKEN_SIMULATOR=... \
#     CLAUDE_CODE_OAUTH_TOKEN=... ./scripts/agent/reproduce-issue.sh

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# gh.sh addresses PR_NUMBER. Issues share that numbering and the endpoints
# used here, so the issue number goes in under that name.
PR_NUMBER="${ISSUE_NUMBER:-}"

# shellcheck source=scripts/agent/lib/gh.sh
. "$PROJECT_ROOT/scripts/agent/lib/gh.sh"

# --announce: post the "started" comment and exit. The workflow's first job
# runs this, so the issue hears about the run before any build starts.
if [ "${1:-}" = "--announce" ]; then
  for var in ISSUE_NUMBER GH_REPO GH_TOKEN; do
    [ -n "${!var:-}" ] || { echo "error: $var is not set" >&2; exit 1; }
  done
  gh_comment "Started a reproduction attempt on an iOS cloud simulator, against the default branch. The verdict will be posted here, usually within 30 minutes."
  exit $?
fi
# shellcheck source=scripts/agent/lib/sim.sh
. "$PROJECT_ROOT/scripts/agent/lib/sim.sh"
# shellcheck source=scripts/agent/lib/session.sh
. "$PROJECT_ROOT/scripts/agent/lib/session.sh"
# shellcheck source=scripts/agent/lib/evidence.sh
. "$PROJECT_ROOT/scripts/agent/lib/evidence.sh"
# shellcheck source=scripts/lib/resolve-sim-build.sh
. "$PROJECT_ROOT/scripts/lib/resolve-sim-build.sh"

EVIDENCE_DIR="$PROJECT_ROOT/evidence"
VERDICT_FILE="$PROJECT_ROOT/evidence/verdict.md"
: "${REPRO_BUILD_ID:=${BUILD_ID:-}}"
: "${CLAUDE_TIMEOUT:=20m}"
: "${SESSION_MAX_MINUTES:=30}"
: "${RUN_URL:=}"

# A fixed update branch, not one per issue: every run publishes the same
# default-branch code, and one branch keeps the update list readable.
UPDATE_BRANCH="agent-reproduce"

COMMENT_POSTED=""
# Set when the run could not reach the app at all. That is a broken pipeline,
# not a judgement about the bug, so it fails the job.
INFRA_FAILED=""

log()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mwarn:\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; }

# inconclusive <reason> — record a verdict for a run that could not try at all.
inconclusive() {
  printf 'INCONCLUSIVE: %s\n' "$1" > "$VERDICT_FILE"
  INFRA_FAILED=1
  fail "$1"
}

# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------

# The session bills until stopped, and a run that dies before commenting would
# leave the issue silent. A verdict that was reached is reported even when a
# later step failed.
cleanup() {
  local code=$?
  trap - EXIT

  session_stop

  if [ "$code" -ne 0 ] && [ -z "$COMMENT_POSTED" ]; then
    local line
    line="$(head -n 1 "$VERDICT_FILE" 2>/dev/null || echo "")"
    if [ -n "$line" ]; then
      gh_comment "$(printf '## Reproduction attempt\n\n**Verdict:** %s\n\n⚠️ A later step failed after the verdict was reached. Full logs are on the %s.\n' \
        "$line" "${RUN_URL:+[workflow run]($RUN_URL)}")" || true
    else
      gh_comment "$(printf '## Reproduction attempt\n\n⚠️ **The run errored before reaching a verdict.** Logs are on the %s.\n' \
        "${RUN_URL:+[workflow run]($RUN_URL)}")" || true
    fi
  fi

  exit "$code"
}

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

missing=""
for var in ISSUE_NUMBER GH_REPO GH_TOKEN EXPO_TOKEN_SIMULATOR CLAUDE_CODE_OAUTH_TOKEN; do
  [ -n "${!var:-}" ] || missing="$missing $var"
done
if [ -n "$missing" ]; then
  fail "missing required variables:$missing"
  fail "see .eas/workflows/SETUP.md for the one-time setup"
  exit 1
fi

trap cleanup EXIT INT TERM

rm -rf "$EVIDENCE_DIR"
mkdir -p "$EVIDENCE_DIR/issue"
# upload_artifact errors when nothing matches its globs, which turns one
# failure into two and loses the logs. Guarantee a match from the first line.
printf 'Reproduction run for issue #%s\n' "$ISSUE_NUMBER" > "$EVIDENCE_DIR/run.txt"

log "Reproducing issue #$ISSUE_NUMBER"
ISSUE_JSON="$(gh_issue_json)" || { fail "could not read issue #$ISSUE_NUMBER"; exit 1; }
ISSUE_TITLE="$(printf '%s' "$ISSUE_JSON" | gh_field title)"
log "  title:  $ISSUE_TITLE"
log "  commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

if [ -n "$(printf '%s' "$ISSUE_JSON" | gh_field pull_request)" ]; then
  fail "#$ISSUE_NUMBER is a pull request, not an issue. Use the agent-verify label on PRs."
  exit 1
fi

# ---------------------------------------------------------------------------
# Gather the report
# ---------------------------------------------------------------------------

# All of this is user-written and reaches Claude only as files.
{
  printf '# %s\n\n' "$ISSUE_TITLE"
  printf '%s' "$ISSUE_JSON" | gh_field body
} > "$EVIDENCE_DIR/issue.md"

# Every trusted `/agent` comment on the issue is maintainer guidance. No time
# boundary: unlike a PR, an issue has no commit that would make an older
# comment stale.
gh_collect_requests "" "/agent" > "$EVIDENCE_DIR/requests.md" 2>/dev/null \
  || : > "$EVIDENCE_DIR/requests.md"
if [ -s "$EVIDENCE_DIR/requests.md" ]; then
  log "  /agent guidance:"
  sed 's/^/    /' "$EVIDENCE_DIR/requests.md" | head -n 20
fi

# Screenshots in a bug report often carry the whole bug. Fetch the ones GitHub
# hosts, so Claude can look at them. GitHub hosts only, so issue text cannot
# point the worker at an arbitrary URL; a size and count cap; and no token,
# because these URLs are public for a public repository. They go in a
# subdirectory, so the evidence page publishes only the run's own screenshots.
download_issue_images() {
  printf '%s' "$ISSUE_JSON" | gh_field body | python3 -c '
import re, sys
text = sys.stdin.read()
urls = re.findall(r"https://(?:github\.com/user-attachments/assets/|user-images\.githubusercontent\.com/|private-user-images\.githubusercontent\.com/)[A-Za-z0-9._/%-]+", text)
seen = []
for u in urls:
    if u not in seen:
        seen.append(u)
print("\n".join(seen[:6]))
' | {
    local n=0 url
    while IFS= read -r url; do
      [ -n "$url" ] || continue
      n=$(( n + 1 ))
      curl --silent --show-error --location --fail \
        --max-filesize 10000000 --max-time 30 \
        --output "$EVIDENCE_DIR/issue/reporter-$n.img" "$url" 2>/dev/null \
        || { rm -f "$EVIDENCE_DIR/issue/reporter-$n.img"; continue; }
      # Name the file for what it is, so Claude's Read tool treats it as an
      # image. Sniffed from the bytes, because the URL has no extension and
      # the worker may not have `file`. Anything that is not an image is dropped.
      local ext
      ext="$(python3 -c '
import sys
head = open(sys.argv[1], "rb").read(12)
if head.startswith(b"\x89PNG"): print("png")
elif head.startswith(b"\xff\xd8\xff"): print("jpg")
elif head[:6] in (b"GIF87a", b"GIF89a"): print("gif")
elif head[:4] == b"RIFF" and head[8:12] == b"WEBP": print("webp")
' "$EVIDENCE_DIR/issue/reporter-$n.img" 2>/dev/null)"
      if [ -n "$ext" ]; then
        mv "$EVIDENCE_DIR/issue/reporter-$n.img" "$EVIDENCE_DIR/issue/reporter-$n.$ext"
      else
        rm -f "$EVIDENCE_DIR/issue/reporter-$n.img"
      fi
    done
  }
}
download_issue_images
log "  reporter images: $(find "$EVIDENCE_DIR/issue" -type f | wc -l | tr -d ' ')"

# ---------------------------------------------------------------------------
# Resolve the binary, publish the JS, boot the session
# ---------------------------------------------------------------------------

resolve_inputs() {
  if [ -z "$REPRO_BUILD_ID" ]; then
    BUILD_PROFILE=development-simulator
    REPRO_BUILD_ID="$(resolve_build_id 2>>"$EVIDENCE_DIR/build-resolve.log")" || REPRO_BUILD_ID=""
    if [ -z "$REPRO_BUILD_ID" ]; then
      inconclusive "no unexpired development-simulator build matches this runtime, so nothing could run."
      return 1
    fi
  fi

  if [ -z "$UPDATE_GROUP_ID" ]; then
    log "Publishing this checkout as an EAS Update on branch '$UPDATE_BRANCH'"
    if ! session_publish_update "$UPDATE_BRANCH" "Reproduce issue #$ISSUE_NUMBER" "$EVIDENCE_DIR/update.log"; then
      tail -n 15 "$EVIDENCE_DIR/update.log" >&2 2>/dev/null
      inconclusive "$SESSION_ERROR"
      return 1
    fi
  fi

  log "  build:  $REPRO_BUILD_ID"
  log "  update: $UPDATE_GROUP_ID"
}

start_session() {
  local session_name
  session_name="$(printf 'Repro issue #%s: %s' "$ISSUE_NUMBER" "$ISSUE_TITLE" | cut -c1-50)"
  log "Starting the EAS Simulator session"
  session_start "$REPRO_BUILD_ID" "$UPDATE_GROUP_ID" "$session_name" || {
    inconclusive "$SESSION_ERROR"
    return 1
  }
  [ -n "$SESSION_URL" ] && log "  session: $SESSION_URL"
}

# ---------------------------------------------------------------------------
# Run the reproducer
# ---------------------------------------------------------------------------

run_reproducer() {
  sim_clear_startup_prompts 60

  # A deterministic floor beneath the AI: the app rendered something at all.
  # This is the pipeline's failure, not evidence about the bug.
  log "Snapshotting the launch state"
  local snapshot
  snapshot="$(npx --yes agent-device@latest snapshot -i --udid "$SIM_UDID" 2>"$EVIDENCE_DIR/launch-snapshot.log" || true)"
  printf '%s\n' "$snapshot" > "$EVIDENCE_DIR/launch-snapshot.txt"
  if [ -z "$snapshot" ] || ! printf '%s' "$snapshot" | grep -q 'ROOT'; then
    inconclusive "the app produced no UI after launch — the update may not have loaded."
    return 0
  fi

  local prompt="$EVIDENCE_DIR/reproduce-prompt.md"
  cp "$PROJECT_ROOT/scripts/agent/prompts/reproduce.md" "$prompt"
  {
    printf '\n---\n\n## This run\n\n'
    printf -- '- The issue is #%s.\n' "$ISSUE_NUMBER"
    printf -- '- Pass `udid: %s` to every agent-device tool.\n' "$SIM_UDID"
    printf -- '- The app is built from commit `%s` of the default branch.\n' \
      "$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
    printf '\nFiles:\n\n'
    printf -- '- `evidence/issue.md` — the issue title and description, as the reporter wrote them.\n'
    if [ -s "$EVIDENCE_DIR/requests.md" ]; then
      printf -- '- `evidence/requests.md` — maintainers'"'"' `/agent` comments. Trusted guidance.\n'
    fi
    if [ -n "$(find "$EVIDENCE_DIR/issue" -type f 2>/dev/null)" ]; then
      printf -- '- `evidence/issue/` — images the reporter attached, in the order they appear in the issue.\n'
    fi
  } >> "$prompt"

  local mcp_config="$EVIDENCE_DIR/agent-device-mcp.json"
  agent_device_mcp_config "$mcp_config" >/dev/null

  log "Running the reproducer (timeout $CLAUDE_TIMEOUT)"
  # The verdict file is the contract, not Claude's exit code. timeout is the
  # hard backstop: a hung agent is killed and leaves no verdict.
  timeout "$CLAUDE_TIMEOUT" claude \
    --print "$(cat "$prompt")" \
    --permission-mode bypassPermissions \
    --mcp-config "$mcp_config" \
    --output-format stream-json --verbose \
    > "$EVIDENCE_DIR/reproducer.jsonl" 2>&1 || true

  # Anything other than the three verdicts is not a verdict. Never let a
  # malformed first line pass as one.
  if ! head -n 1 "$VERDICT_FILE" 2>/dev/null | grep -qE '^(REPRODUCED|NOT_REPRODUCED|INCONCLUSIVE)\b'; then
    inconclusive "the reproducer produced no valid verdict (agent error, timeout, or runaway)."
  fi
}

if resolve_inputs && start_session; then
  run_reproducer
fi

VERDICT_LINE="$(head -n 1 "$VERDICT_FILE")"
log "Verdict: $VERDICT_LINE"

# Stop as soon as the verdict is in. The session bills until then.
session_stop

# ---------------------------------------------------------------------------
# Publish the evidence and report
# ---------------------------------------------------------------------------

log "Publishing the evidence site"
EVIDENCE_URL="$(publish_evidence "$EVIDENCE_DIR" "Issue #${ISSUE_NUMBER}" "$VERDICT_LINE" "issue-${ISSUE_NUMBER}-repro" "reproduction")"
if [ -n "$EVIDENCE_URL" ]; then
  log "Evidence: $EVIDENCE_URL"
else
  warn "the evidence site did not publish; the comment will omit the link"
fi

REPORT="$(tail -n +2 "$VERDICT_FILE")"
[ -n "$REPORT" ] || REPORT="_No report. The run could not reach the app._"

# Built before the heredoc, not inside it: bash 3.2 on macOS mis-parses a
# command substitution nested in a heredoc inside a command substitution.
LINKS=""
[ -n "$EVIDENCE_URL" ] && LINKS="🖼️ **[Evidence](${EVIDENCE_URL})** — screenshots from the run"
if [ -n "$SESSION_URL" ]; then
  [ -n "$LINKS" ] && LINKS="$LINKS · "
  LINKS="${LINKS}📱 **[Simulator session](${SESSION_URL})** — recording and logs on expo.dev"
fi
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"

gh_comment "$(cat <<EOF
## Reproduction attempt

**Verdict:** ${VERDICT_LINE}

${LINKS}

<details>
<summary>Full report</summary>

${REPORT}

</details>

_EAS cloud simulator · iOS · build \`${REPRO_BUILD_ID:-none}\` · default branch at \`${COMMIT}\`. To steer a new attempt, comment \`/agent <what to try>\` and apply the \`agent-reproduce\` label again._
EOF
)" && COMMENT_POSTED=1 || warn "could not post the comment"

if command -v set-output >/dev/null 2>&1; then
  set-output verdict "$VERDICT_LINE"
  set-output evidence_url "$EVIDENCE_URL"
  set-output session_url "$SESSION_URL"
fi

# Any verdict the reproducer reached is a successful run, whichever way it went.
# Only a run that never reached the app, or never reported, is red.
if [ -n "$INFRA_FAILED" ] || [ -z "$COMMENT_POSTED" ]; then
  exit 1
fi
exit 0
