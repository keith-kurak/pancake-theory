#!/usr/bin/env bash
#
# Run an Expo Explore review of a pull request and post the report link on it.
#
# Called by .eas/workflows/explore-review-on-pr.yaml. It uses `expo-explore
# capture`, the local-review path, not the GitHub Actions `capture:review` path:
# only the local path accepts a Claude subscription token
# (CLAUDE_CODE_OAUTH_TOKEN, from `claude setup-token`). `capture:review` needs
# ANTHROPIC_API_KEY.
#
# Required: PR_NUMBER, GH_REPO (owner/name), BASE_REF, EXPLORE_VERSION,
#           GITHUB_TOKEN, EXPO_TOKEN_SIMULATOR, CLAUDE_CODE_OAUTH_TOKEN
# Optional: RUN_URL (linked from the comment), EXPLORE_OUT (default explore-out)

set -euo pipefail

: "${EXPLORE_OUT:=explore-out}"
: "${RUN_URL:=}"

for var in PR_NUMBER GH_REPO BASE_REF EXPLORE_VERSION GITHUB_TOKEN EXPO_TOKEN_SIMULATOR CLAUDE_CODE_OAUTH_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo "explore: $var is not set." >&2
    exit 1
  fi
done

# EAS Simulator sessions are actor-gated: the restricted EXPO_TOKEN that EAS
# injects into every job cannot start one. See scripts/agent/lib/sim.sh.
export EXPO_TOKEN="$EXPO_TOKEN_SIMULATOR"

# The job environment sets APP_VARIANT, which app.config.js turns into a
# different bundle id. The `explore` build profile resolves its own (empty) EAS
# environment, and .expo-explore/config.yaml expects the base bundle id.
unset APP_VARIANT
# With an API key present, Explore bills the key instead of the subscription.
unset ANTHROPIC_API_KEY

# Explore compares HEAD with the commit where it left the base branch. The
# checkout may be shallow and its remote may lack credentials, so fetch from an
# explicit authenticated URL.
REMOTE_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GH_REPO}.git"
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --no-tags --unshallow "$REMOTE_URL" HEAD
fi
git fetch --no-tags "$REMOTE_URL" "+refs/heads/${BASE_REF}:refs/remotes/origin/${BASE_REF}"
BASE_SHA="$(git merge-base HEAD "origin/${BASE_REF}")"
echo "explore: base ${BASE_REF} at ${BASE_SHA}, head $(git rev-parse HEAD)"

mkdir -p "$EXPLORE_OUT"
set +e
npx --yes "@expo/explore@${EXPLORE_VERSION}" capture \
  --committed --base "$BASE_SHA" --platform ios \
  --upload --json --output "$EXPLORE_OUT/reports" \
  > "$EXPLORE_OUT/result.json"
CAPTURE_STATUS=$?
set -e
echo "explore: capture exited with $CAPTURE_STATUS"
cat "$EXPLORE_OUT/result.json" || true

# Post the result as one PR comment, updated on each push.
RESULT_FILE="$EXPLORE_OUT/result.json" CAPTURE_STATUS="$CAPTURE_STATUS" node <<'NODE'
const fs = require("node:fs");
const marker = "<!-- expo-explore-eas-review -->";
const { GH_REPO, PR_NUMBER, GITHUB_TOKEN, RUN_URL, RESULT_FILE, CAPTURE_STATUS } = process.env;

let result = null;
try {
  result = JSON.parse(fs.readFileSync(RESULT_FILE, "utf8"));
} catch {
  // No JSON: the capture failed before it could report. The run log has the cause.
}

const lines = [marker, "### Expo Explore review"];
if (result?.url) {
  lines.push("", `**[Open Explore report](${result.url})**`);
  if (result.expiresAt) lines.push(`Available until ${result.expiresAt.slice(0, 10)}.`);
}
if (result?.base?.sha && result?.head?.sha) {
  lines.push("", `Compared \`${result.head.sha.slice(0, 8)}\` with base \`${result.base.sha.slice(0, 8)}\`.`);
}
for (const failure of result?.failures ?? []) {
  lines.push("", `:x: ${failure.target}: \`${failure.code}\` ${failure.message}`);
}
if (!result?.url) {
  lines.push("", `:x: The review did not produce a hosted report (exit ${CAPTURE_STATUS}).`);
}
if (RUN_URL) lines.push("", `[Workflow run](${RUN_URL})`);
const body = lines.join("\n");

const api = `https://api.github.com/repos/${GH_REPO}`;
const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
};

(async () => {
  const listed = await fetch(`${api}/issues/${PR_NUMBER}/comments?per_page=100`, { headers });
  if (!listed.ok) throw new Error(`Listing comments failed: ${listed.status}`);
  const existing = (await listed.json()).find(comment => comment.body?.includes(marker));
  const response = existing
    ? await fetch(`${api}/issues/comments/${existing.id}`, { method: "PATCH", headers, body: JSON.stringify({ body }) })
    : await fetch(`${api}/issues/${PR_NUMBER}/comments`, { method: "POST", headers, body: JSON.stringify({ body }) });
  if (!response.ok) throw new Error(`Posting the comment failed: ${response.status}`);
  console.log(`explore: ${existing ? "updated" : "posted"} the PR comment`);
})().catch(error => {
  console.error(`explore: ${error.message}`);
  process.exitCode = 1;
});
NODE

exit "$CAPTURE_STATUS"
