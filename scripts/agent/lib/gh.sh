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
# Booleans come back as JSON spells them ("true"/"false"), not as Python's
# "True"/"False", so callers can compare against one form.
gh_field() {
  python3 -c '
import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."):
    d = (d or {}).get(k)
if d is None:
    print("")
elif isinstance(d, bool):
    print("true" if d else "false")
else:
    print(d)
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
  _gh_graphql_pr_mutation markPullRequestReadyForReview "$1"
}

# gh_remove_label <label>
#
# GitHub only fires `labeled` when a label goes from absent to present, so a run
# must take its own trigger label off. Without this, asking for a second run
# means removing the label by hand first, and re-applying it silently does
# nothing. A 404 just means it was already gone.
gh_remove_label() {
  local label="$1" encoded
  encoded="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$label")"
  _gh_curl DELETE "/repos/$GH_REPO/issues/$PR_NUMBER/labels/$encoded" >/dev/null 2>&1 || true
}

# gh_convert_to_draft <pr_node_id>
#
# The REST API cannot set draft state in either direction; both transitions are
# GraphQL mutations. See gh_mark_ready for the other one.
gh_convert_to_draft() {
  _gh_graphql_pr_mutation convertPullRequestToDraft "$1"
}

_gh_graphql_pr_mutation() {
  local mutation="$1" node_id="$2" query payload response
  query="mutation(\$id:ID!){${mutation}(input:{pullRequestId:\$id}){clientMutationId}}"
  payload="$(python3 -c '
import json, sys
print(json.dumps({"query": sys.argv[1], "variables": {"id": sys.argv[2]}}))
' "$query" "$node_id")"

  response="$(curl --silent --show-error --fail-with-body \
    --request POST \
    --header "Authorization: Bearer $GH_TOKEN" \
    --header "Content-Type: application/json" \
    --data "$payload" \
    "$GH_API/graphql")"

  # GraphQL answers 200 even when the mutation fails, so check the body.
  if printf '%s' "$response" | grep -q '"errors"'; then
    echo "gh: $mutation failed: $response" >&2
    return 1
  fi
}

# gh_collect_requests <since_iso8601> <marker>
#
# Print the change requests a reviewer left on this PR, as markdown.
#
# Two comment kinds are gathered, because a reviewer naturally uses both:
#   - issue comments  — the main PR conversation
#   - review comments — inline on a diff line, which carry file and line context
#
# Two filters, both load-bearing:
#   - the marker prefix, so ordinary discussion in the same thread is ignored
#   - author_association, so only OWNER / MEMBER / COLLABORATOR can instruct the
#     agent. This repository is public and anyone can comment; without this,
#     a stranger's comment would become agent instructions on the next run.
gh_collect_requests() {
  local since="$1" marker="$2" issue_json review_json
  issue_json="$(_gh_curl GET "/repos/$GH_REPO/issues/$PR_NUMBER/comments?per_page=100" || echo '[]')"
  review_json="$(_gh_curl GET "/repos/$GH_REPO/pulls/$PR_NUMBER/comments?per_page=100" || echo '[]')"

  python3 -c '
import json, sys

since, marker = sys.argv[1], sys.argv[2]
TRUSTED = {"OWNER", "MEMBER", "COLLABORATOR"}

def load(raw):
    try:
        value = json.loads(raw)
        return value if isinstance(value, list) else []
    except Exception:
        return []

def wanted(c):
    if c.get("author_association") not in TRUSTED:
        return False
    if since and (c.get("created_at") or "") <= since:
        return False
    return (c.get("body") or "").lstrip().startswith(marker)

def strip(body):
    return (body or "").lstrip()[len(marker):].strip()

items = []
for c in load(sys.argv[3]):
    if wanted(c):
        items.append((c["created_at"], c["user"]["login"], None, None,
                      strip(c["body"]), c.get("html_url", "")))
for c in load(sys.argv[4]):
    if wanted(c):
        items.append((c["created_at"], c["user"]["login"], c.get("path"),
                      c.get("line") or c.get("original_line"),
                      strip(c["body"]), c.get("html_url", "")))

items.sort()
for created, user, path, line, body, url in items:
    where = f" on `{path}`" + (f" line {line}" if line else "") if path else ""
    print(f"### @{user}{where}")
    print(f"<!-- {url} -->")
    print()
    print(body)
    print()
' "$since" "$marker" "$issue_json" "$review_json"
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
