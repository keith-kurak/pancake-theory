# shellcheck shell=bash
#
# Publish a run's evidence as a static page on EAS Hosting, with
# eas-simulator-evidence (https://github.com/jacobhammerle/eas-simulator-evidence).
#
# Shared by verify-pr.sh, reproduce-issue.sh, and run-agent-pr.sh. The page
# holds the verdict, the agent's report, the screenshots with taps marked, the
# session timeline, CPU and memory charts, and the recording. GitHub markdown
# will not render an EAS artifact link — it is behind expo.dev auth — so the
# page is hosted instead, and the PR or issue comment links to it.

# Pinned so a new release cannot change a CI run without a commit here.
: "${EVIDENCE_TOOL_VERSION:=0.2.2}"

# publish_evidence <dir> <subject> <verdict_file> <alias> [build_id]
#
# <verdict_file>: line 1 is the verdict, the rest becomes the "Agent report".
# The session id comes from EAS_SIMULATOR_SESSION_ID, which session_start
# exports from .env.eas-simulator. It must be passed explicitly: the callers
# stop the session first, and `eas simulator:stop` clears that file.
#
# Prints the deployed URL on stdout, or nothing if publishing failed. Never
# fatal: losing the page must not lose the verdict that goes with it.
publish_evidence() {
  local dir="$1" subject="$2" verdict_file="$3" alias="$4" build_id="${5:-}"
  local session_id="${EAS_SIMULATOR_SESSION_ID:-}"

  # A run that never reached a session has nothing to show, and an empty page
  # is worse than no link.
  if [ -z "$session_id" ] && ! ls "$dir"/*.png "$dir"/*.jpg "$dir"/*.mp4 >/dev/null 2>&1; then
    echo "evidence: no session and no screenshots, skipping publish" >&2
    return 0
  fi

  # --screenshots: the verifier's own screenshots are taken through the remote
  # daemon and do not land in <dir>. This pulls the session's captures into
  # <dir> when it holds no images.
  local args=(run "$dir"
    --subject "$subject"
    --verdict-file "$verdict_file"
    --deploy-alias "$alias"
    --agent "Claude"
    --screenshots
    --json)
  [ -n "$session_id" ] && args+=(--session "$session_id")
  [ -n "$build_id" ] && args+=(--build-id "$build_id")

  local out
  out="$(npx --yes "eas-simulator-evidence@${EVIDENCE_TOOL_VERSION}" "${args[@]}" \
    2>"$dir/evidence-site.log")" || {
      echo "evidence: eas-simulator-evidence failed. Last lines:" >&2
      tail -n 15 "$dir/evidence-site.log" >&2
      return 0
    }

  local url
  url="$(printf '%s' "$out" | python3 -c '
import json, sys
try:
    print(json.loads(sys.stdin.read().strip().splitlines()[-1]).get("url") or "")
except Exception:
    print("")
' 2>/dev/null || echo "")"

  if [ -z "$url" ]; then
    echo "evidence: the site built but the deploy produced no URL" >&2
    # The likeliest first-run cause, and the least obvious: EAS Hosting needs a
    # globally-unique preview subdomain before it accepts a deployment, and the
    # CLI normally asks for one interactively. It cannot ask here.
    if grep -qiE 'dev.?domain|subdomain|non-interactive' "$dir/evidence-site.log" 2>/dev/null; then
      echo "evidence: EAS Hosting looks unactivated. Choose a preview subdomain" >&2
      echo "evidence: once, then re-run. See .eas/workflows/SETUP.md." >&2
    fi
    tail -n 15 "$dir/evidence-site.log" >&2
    return 0
  fi

  printf '%s' "$url"
}
