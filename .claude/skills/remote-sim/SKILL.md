---
name: remote-sim
description: Run this app on a remote EAS Simulator with the latest iOS development build, connected to a local tunnelled dev server and driven by Argent. Use when the user wants to test on a remote simulator, share a live simulator session, start an EAS Simulator session, run the dev build somewhere other than a local simulator, or point Argent at a remote device.
---

# Remote simulator with a live dev server

Runs the **latest iOS development build** on a **remote EAS Simulator**, connects it to a
**local dev server** over a tunnel, and points the **Argent** MCP tools at it.

Three moving parts must line up:

| Part | Command | Purpose |
|---|---|---|
| Dev server | `npm run start-dev-for-sim` | Serves JS over a public tunnel |
| Remote simulator | `npm run start-sim start` | Boots an EAS simulator, installs the dev build |
| Argent link | done by `start-sim` | Routes MCP/CLI tools to the remote device |

## Order matters

Start the **dev server first**. The simulator needs the tunnel URL at launch time so it can
deep-link the dev build straight into the dev server. Starting the simulator first leaves the
dev-client launcher on "No development servers found", because a remote simulator cannot reach
your LAN.

## Step 1 — start the tunnelled dev server

```bash
npm run start-dev-for-sim
```

This runs `EXPO_UNSTABLE_TUNNEL_V2=1 APP_VARIANT=DEV npx expo start --tunnel`.

Run it in the background and wait for the tunnel URL. It prints:

```
Waiting on exp+pancake-theory://c-keithco-mn2vbl-mtdaugbjg5hv257v.on.expo.app
```

Convert that to the `https://` form for the next step — same host, different scheme:

```
https://c-keithco-mn2vbl-mtdaugbjg5hv257v.on.expo.app
```

To extract it from a log file:

```bash
grep -ao 'exp+pancake-theory://[a-z0-9.-]*' <logfile> | tail -1 | sed 's|exp+pancake-theory://|https://|'
```

**Port conflicts.** This machine often has other Metro instances on 8081/8082. `expo start` cannot
prompt in non-interactive mode and exits with `Input is required`. Pick a free port explicitly:

```bash
for p in 8085 8086 8087 8090; do lsof -ti tcp:$p >/dev/null 2>&1 || { echo "free:$p"; break; }; done
EXPO_UNSTABLE_TUNNEL_V2=1 APP_VARIANT=DEV npx expo start --tunnel --port 8085
```

## Step 2 — start the remote simulator, wired to the dev server

```bash
npm run start-sim start -- --metro-url "https://c-keithco-...on.expo.app"
```

`--metro-url` builds the dev-client deep link
(`pancaketheory://expo-development-client/?url=<encoded>`) and passes it as `--open-url`, so the
build launches straight into your dev server. The script rejects `localhost`/LAN URLs, which the
remote simulator cannot reach.

Without `--metro-url` the session still starts, but the app sits at the empty launcher.

Other options: `--build-id`, `--idle <minutes>` (default 5), `--name`, `--profile`, `--open-url`.

### Never pipe `start` into `head`

The script uses `set -o pipefail`. Truncating its output with `head` sends SIGPIPE and kills it
**before the `argent link` step**, leaving a running session that no tool is pointed at. Use
`tail`, redirect to a file, or let it print in full.

## Step 3 — verify

```bash
npm run start-sim status          # session + link state
argent run list-devices           # should show ~14 devices, not your ~120 local ones
```

A remote session shows one booted iPhone plus a few Apple TV runtimes. Your local machine has far
more devices — that count is the quickest way to tell which target you are on.

Then screenshot to confirm the app loaded from the dev server:

```bash
argent run screenshot --udid <booted-udid>
```

A healthy result shows the app running, or the dev menu naming the build (`PK-DEV`) and its runtime
version.

## Step 4 — use the Argent MCP tools

`start-sim` runs `argent link`, which is **global** (`~/.argent/link.json`). It redirects every
Argent client on the machine, not just this project.

**The MCP server caches its target at startup.** Already-running `mcp__argent__*` tools keep hitting
local simulators until Claude Code / the editor is restarted. Either restart, or use the `argent run
<tool>` CLI in the meantime — that picks up the link immediately.

If `ARGENT_TOOLS_URL` is set in the shell it overrides the link file. The script warns when it
detects a mismatch.

## Step 5 — tear down

```bash
npm run start-sim stop
```

Stops the EAS session, runs `argent unlink`, and deletes `.env.eas-simulator`. Then stop the dev
server. Restart the editor again to return the MCP tools to local simulators.

Sessions also self-stop after the idle timeout (default 5 minutes).

## Gotchas

### Runtime version mismatch — the most common failure

A development build only runs JS built for **its own runtime version**. Loading a bundle from a dev
server on a different runtime crashes at startup:

```
[runtime not ready]: ReferenceError: Property 'MessageQueue' doesn't exist
```

Newest-by-date is *not* the right build: an old-SDK branch build can finish *after* a current one.
This repo hit exactly that — the most recent `development-simulator` build was SDK 55 / runtime
1.0.2 while the working copy was SDK 57 / runtime 1.3.0.

`start-sim` now resolves the local runtime with `expo config` and only picks a build whose
`runtime.version` matches. If none matches it lists the candidates and stops rather than starting a
session that will crash. Fix by building a current one:

```bash
npx eas-cli@latest build --platform ios --profile development-simulator
```

Use `--build-id <id>` to bypass the check deliberately.

### Expired artifacts

EAS expires simulator artifacts after ~30 days. Expired builds cannot be installed; the script skips
them automatically.

### Orphaned sessions

Starting a session does **not** stop the previous one — it only stops tracking it in
`.env.eas-simulator`. The old session runs until its idle/max timeout. The script detects this and
prints the exact `eas simulator:stop --id <id>` command. Check for strays with:

```bash
npx eas-cli@latest simulator:list
```

### Secrets

`.env.eas-simulator` holds a bearer token and is gitignored. Never print its values; `start-sim
status` deliberately prints key names only.

## Reference

- Script: `scripts/remote-sim.sh` (`start` | `stop` | `status`)
- npm: `start-sim`, `start-dev-for-sim`
- Session type is `--type argent`; do **not** run `agent-device` commands against it
- Docs: https://docs.expo.dev/preview/eas-simulator/run-and-control/
