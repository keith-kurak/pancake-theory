# shellcheck shell=bash
#
# Publish a run's screenshots as a static page on EAS Hosting.
#
# Shared by verify-pr.sh and run-agent-pr.sh: both drive the app and capture
# screenshots, and in both cases those are useless to a reviewer while they sit
# inside a downloadable tarball. GitHub markdown will not render an EAS artifact
# link — it is behind expo.dev auth — so the page is hosted instead.

# publish_evidence <dir> <subject> <verdict> <alias>
#
# Prints the deployed URL on stdout, or nothing if publishing failed. Never
# fatal: losing the screenshots must not lose the verdict that goes with them.
publish_evidence() {
  local dir="$1" subject="$2" verdict="$3" alias="$4"

  # Nothing to show. A run that never reached the app has no evidence, and an
  # empty page is worse than no link.
  if ! ls "$dir"/*.png "$dir"/*.jpg "$dir"/*.mp4 >/dev/null 2>&1; then
    echo "evidence: no screenshots captured, skipping publish" >&2
    return 0
  fi

  node scripts/agent/build-evidence-site.mjs "$dir" "$subject" "$verdict" >&2 || {
    echo "evidence: could not build the site" >&2
    return 0
  }

  # eas deploy joins --export-dir onto the project directory, so an absolute
  # path is doubled and reported as "not found". It must be relative to the root.
  local rel="${dir#"$PWD"/}"
  local deploy_json
  deploy_json="$(npx --yes eas-cli@latest deploy \
    --export-dir "$rel/site" \
    --alias "$alias" \
    --non-interactive --json 2>"$dir/deploy.log" || echo "")"

  local url
  url="$(printf '%s' "$deploy_json" | python3 -c '
import json, sys
raw = sys.stdin.read()
start = raw.find("{")
if start < 0:
    print(""); raise SystemExit
try:
    d = json.loads(raw[start:])
except Exception:
    print(""); raise SystemExit
aliases = d.get("aliases") or []
print((aliases[0].get("url") if aliases else None) or d.get("url") or "")
' 2>/dev/null || echo "")"

  if [ -z "$url" ]; then
    echo "evidence: deploy produced no URL" >&2
    # The likeliest first-run cause, and the least obvious: EAS Hosting needs a
    # globally-unique preview subdomain before it accepts a deployment, and the
    # CLI normally asks for one interactively. It cannot ask here.
    if grep -qiE 'dev.?domain|subdomain|non-interactive' "$dir/deploy.log" 2>/dev/null; then
      echo "evidence: EAS Hosting looks unactivated. Choose a preview subdomain" >&2
      echo "evidence: once, then re-run. See .eas/workflows/SETUP.md." >&2
    fi
    [ -s "$dir/deploy.log" ] && tail -n 15 "$dir/deploy.log" >&2
    return 0
  fi

  printf '%s' "$url"
}
