# shellcheck shell=bash
#
# resolve_build_id — pick the newest EAS iOS simulator build this working copy
# can actually run.
#
# Sourced by scripts/remote-sim.sh (local dev) and scripts/agent/run-agent-pr.sh
# (the EAS Workflows agent job). Prints the build id on stdout; everything else
# goes to stderr so callers can capture the id with $(...).
#
# Reads these variables from the caller, each with a default:
#   EAS            command used to invoke eas-cli. Default: "npx eas-cli@latest"
#   BUILD_PROFILE  eas.json build profile.       Default: "development-simulator"
#
# The caller may define info()/err(); plain fallbacks are used otherwise.

: "${EAS:=npx eas-cli@latest}"
: "${BUILD_PROFILE:=development-simulator}"

declare -F info >/dev/null 2>&1 || info() { printf '\033[36m==>\033[0m %s\n' "$*"; }
declare -F err  >/dev/null 2>&1 || err()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; }

resolve_build_id() {
  info "Looking up the latest finished '$BUILD_PROFILE' iOS simulator build..." >&2

  # A dev build only runs JS built for its own runtime. Loading a bundle from a
  # dev server with a different runtime version fails at startup (for example
  # "ReferenceError: Property 'MessageQueue' doesn't exist"). Newest-by-date is
  # NOT enough — an old-SDK branch build can finish after a current one.
  local local_runtime
  local_runtime="$(APP_VARIANT=DEV npx expo config --type public --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("runtimeVersion") or "")' 2>/dev/null || true)"
  if [ -n "$local_runtime" ]; then
    info "Local runtime version: $local_runtime" >&2
  else
    err "Could not read the local runtime version; falling back to newest build."
  fi

  local json
  json="$($EAS build:list \
    --platform ios \
    --simulator \
    --status finished \
    --buildProfile "$BUILD_PROFILE" \
    --limit 10 \
    --json \
    --non-interactive 2>/dev/null)" || {
      err "eas build:list failed. Are you logged in? Try: $EAS whoami"
      return 1
    }

  # Keep unexpired builds only (EAS expires simulator artifacts after ~30 days),
  # then prefer one whose runtime version matches this working copy.
  python3 - "$json" "${local_runtime:-}" <<'PY'
import json, sys
from datetime import datetime, timezone

builds = json.loads(sys.argv[1])
want_runtime = sys.argv[2] if len(sys.argv) > 2 else ""
now = datetime.now(timezone.utc)

def parse(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")) if ts else None

def runtime_of(b):
    return (b.get("runtime") or {}).get("version") or ""

usable = [
    b for b in builds
    if not (parse(b.get("expirationDate")) and parse(b["expirationDate"]) <= now)
]

if not usable:
    sys.stderr.write(
        "No unexpired iOS simulator build found for this profile.\n"
        "Build one with:\n"
        "  npx eas-cli@latest build --platform ios --profile development-simulator\n"
    )
    sys.exit(1)

usable.sort(key=lambda b: b.get("completedAt") or "", reverse=True)

matching = [b for b in usable if runtime_of(b) == want_runtime] if want_runtime else []

if want_runtime and not matching:
    sys.stderr.write(
        f"\nNo unexpired build matches local runtime {want_runtime}.\n"
        "Available builds:\n"
    )
    for b in usable[:5]:
        sys.stderr.write(
            f"  {b['id']}  runtime {runtime_of(b) or '?'}  "
            f"sdk {b.get('sdkVersion') or '?'}  completed {b.get('completedAt')}\n"
        )
    sys.stderr.write(
        "\nA build with a different runtime will crash when it loads JS from your\n"
        "dev server. Build a matching one with:\n"
        "  npx eas-cli@latest build --platform ios --profile development-simulator\n"
        "Or pass --build-id explicitly to override this check.\n"
    )
    sys.exit(1)

best = (matching or usable)[0]
sys.stderr.write(
    f"  build {best['id']}  runtime {runtime_of(best) or '?'}  "
    f"sdk {best.get('sdkVersion') or '?'}  completed {best.get('completedAt')}\n"
)
print(best["id"])
PY
}
