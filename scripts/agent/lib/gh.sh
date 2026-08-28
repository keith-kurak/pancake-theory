# shellcheck shell=bash
#
# GitHub helpers for the agent job, over plain curl.
#
# EAS workers do not ship the `gh` CLI and installing it costs minutes of a
# 30-minute budget, so this uses the REST and GraphQL APIs directly.
#
# Requires: GH_TOKEN, GH_REPO (owner/name), PR_NUMBER.

GH_API="https://api.github.com"

_gh_curl() {
  local method="$1" path="$2" body="${3:-}"
  local args=(
    --silent --show-error --fail-with-body
    --request "$method"
    --header "Authorization: Bearer $GH_TOKEN"
    --header "Accept: application/vnd.github+json"
    --header "X-GitHub-Api-Version: 2022-11-28"
  )
  [ -n "$body" ] && args+=(--header "Content-Type: application/json" --data "$body")
  curl "${args[@]}" "$GH_API$path"
}

# Build a JSON object from alternating key/value shell arguments. Values are
# escaped by python, never by string concatenation — PR bodies contain
# backticks, quotes, and newlines that would otherwise break the payload or
# inject fields.
gh_json() {
  python3 -c '
import json, sys
a = sys.argv[1:]
print(json.dumps(dict(zip(a[::2], a[1::2]))))
' "$@"
}

# Read one field out of a JSON document on stdin. Supports dotted paths.
gh_field() {
  python3 -c '
import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."):
    d = (d or {}).get(k)
print("" if d is None else d)
' "$1"
}

gh_pr_json() {
  _gh_curl GET "/repos/$GH_REPO/pulls/$PR_NUMBER"
}

gh_comment() {
  _gh_curl POST "/repos/$GH_REPO/issues/$PR_NUMBER/comments" "$(gh_json body "$1")" >/dev/null
}

# gh_set_body <markdown>
gh_set_body() {
  _gh_curl PATCH "/repos/$GH_REPO/pulls/$PR_NUMBER" "$(gh_json body "$1")" >/dev/null
}

# gh_mark_ready <pr_node_id>
#
# REST cannot clear draft state — `PATCH /pulls/{n}` silently ignores a `draft`
# field. Only this GraphQL mutation works.
gh_mark_ready() {
  local node_id="$1"
  local query='mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){clientMutationId}}'
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({"query": sys.argv[1], "variables": {"id": sys.argv[2]}}))
' "$query" "$node_id")"

  local response
  response="$(curl --silent --show-error --fail-with-body \
    --request POST \
    --header "Authorization: Bearer $GH_TOKEN" \
    --header "Content-Type: application/json" \
    --data "$payload" \
    "$GH_API/graphql")"

  # GraphQL answers 200 even when the mutation fails, so check the body.
  if printf '%s' "$response" | grep -q '"errors"'; then
    echo "gh: markPullRequestReadyForReview failed: $response" >&2
    return 1
  fi
}

# gh_merge_results_block <existing_body> <results_markdown>
#
# Replaces the region between the agent markers, or appends it when absent, so
# repeated runs update one block instead of stacking copies.
gh_merge_results_block() {
  python3 -c '
import re, sys
body, results = sys.argv[1], sys.argv[2]
start, end = "<!-- agent-results:start -->", "<!-- agent-results:end -->"
block = f"{start}\n{results}\n{end}"
pattern = re.compile(re.escape(start) + ".*?" + re.escape(end), re.DOTALL)
if pattern.search(body):
    print(pattern.sub(lambda _: block, body, count=1))
else:
    print((body.rstrip() + "\n\n" + block) if body.strip() else block)
' "$1" "$2"
}
