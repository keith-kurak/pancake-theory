<description>
`agent-device` is the tool for driving this app on a device: iOS simulators, Android emulators,
physical phones, TVs, and web. It replaced `argent` in this project — if you see `argent` anywhere,
it is a leftover, not an instruction.

Use it whenever a task involves:

- Running, inspecting, or testing the app on a simulator, emulator, or device
- Tapping, typing, scrolling, screenshotting, or reading what is on screen
- Any change to visible UI, layout, copy, navigation, or screen composition that should be confirmed
- Manual QA, UI QA, or reproducing a bug
- Profiling, network inspection, or crash symbolication
</description>

<availability_check>
<important>Check once per session, before the first agent-device call. Do not re-probe.</important>

`agent-device` is available if the `mcp__agent-device__*` tools are in your tool list, or
`command -v agent-device` succeeds.

If it is absent, say so once and ask whether to continue without it:

> agent-device isn't installed. Install it with `npm install --global agent-device`.

Do not fall back to `argent`, `xcrun simctl`, or `adb` for things agent-device does.
</availability_check>

<division_of_labour>
This project also configures `@expo/agent-cli` (see the managed block in **AGENTS.md**).
The two do not overlap:

- **agent-device drives the device.** Anything that touches a running app on a simulator,
  emulator, or phone — opening it, reading the screen, tapping, typing, scrolling,
  screenshots, recordings, waits, assertions. Prefer it over agent-cli's `runtime:tree`,
  `runtime:tap`, `runtime:type`, `navigate`, and `smoke`, and over the expo-mcp
  `automation_*` tools.
- **@expo/agent-cli owns the project.** Dev server, installing packages with SDK-compatible
  resolution, prebuild, lint, typecheck, doctor, and `status` / `status --explain` /
  `status --assert` for what a change costs and whether it can ship over the air.

When a task needs both — start the app, then drive it — use agent-cli to get it running and
agent-device from the first interaction onward.
</division_of_labour>

<the_help_is_the_spec>
<important>agent-device documents itself. Read its help instead of guessing flags.</important>

- `agent-device help commands` — the full catalog (68 commands)
- `agent-device help <command>` — exact flags and behavior for one command
- `agent-device help <topic>` — the guides:
  `workflow`, `manual-qa`, `dogfood`, `validate`, `debugging`, `scripting`, `gestures`,
  `react-native`, `react-devtools`, `cdp`, `tv`, `web`, `macos`, `remote`,
  `physical-device`, `ios-system-ui`, `maestro`

This project is React Native + Expo, so `agent-device help react-native` is the relevant guide for
most work here. There is no skills router to consult; these guides are the source of truth.
</the_help_is_the_spec>

<the_loop>
Start a task on a known app with one call. Do not probe first with `devices`, `apps`, `appstate`,
`snapshot`, or `screenshot`:

```
agent-device open <app> --foreground
```

It starts the session and returns the first interactive snapshot with `@refs`. If the app id is
unknown: `devices`, then `apps`, then `open <discovered-id>`. Never invent ids. If a session is
already open, continue from its current state rather than reopening.

Then loop:

```
agent-device press|click|fill|longpress <target> ... --settle
agent-device scroll <direction|top|bottom> [amount] --settle
agent-device back --settle
```

Each acts, waits for quiet, and prints the UI diff — continue from that diff. Run `snapshot -i` only
when the diff lacks your next target or did not settle.

Verify a named expectation with the diff, `wait text "..."`, `wait <selector>`, `is`, `get`, or
`find`. <important>A bare screenshot is not verification.</important>

Finish with `agent-device close`.
</the_loop>

<targets>
<important>Prefer refs, then selectors. Coordinates are the last resort.</important>

- Copy refs exactly, including `@` and any `~sN` pin: `@e12`, `@e12~s4`. Refs go stale after
  mutations. A literal `@handle` in the UI is `label="@handle"`, not a ref.
- Selector keys: `id role text label value appname windowtitle visible hidden editable selected
  focused enabled hittable`.
- Only fall back to coordinates after `snapshot -i` shows no semantic target, or a sparse /
  AX-unavailable warning says refs and selectors are invalid. Then `screenshot`, `press <x> <y>`,
  and re-snapshot.
</targets>

<rules>
- `--settle` is only for `press`, `click`, `fill`, `longpress`, `hover`, `scroll`, and `back`.
  Never on `open`, `snapshot`, or `close`. `type` never accepts it.
- `fill <target> <text> --settle` replaces; `type <text>` appends after focus.
- For a late network or debounced result use `wait text "Expected"`, not snapshot polling.
- Output full `agent-device` commands. No pipes, grep, jq, or invented subcommands.
- Stop when the requested end state is visible. Mutations run serially.
- `batch --steps` runs several commands in one call when no step depends on seeing the screen first.
</rules>

<remote_sessions>
This repo runs remote EAS Simulator sessions through `npm run sim` (see
`.claude/skills/remote-sim/SKILL.md` and `scripts/remote-sim.sh`). Those wrap:

```
eas simulator:start --type agent-device        # writes AGENT_DEVICE_DAEMON_BASE_URL + _AUTH_TOKEN
agent-device connect proxy --daemon-base-url <url> --daemon-auth-token <token> --session default --force
agent-device disconnect
```

Three things to know:

- `--session default` matters. Without it, `connect` makes a fresh named session, and any
  command that does not pass that name with `--session` still targets local devices.
- `connect` state is machine-global. While a session is connected, every agent-device client on this
  machine targets it. Run `agent-device connection status` if you are unsure what you are driving.
- The MCP server does not expose `connect` / `disconnect`. The CLI must connect first; the MCP tools
  then follow that state. After connecting, restart the editor so the MCP server picks it up.
</remote_sessions>

<cleanup>
When the user says they are done, or the session ends: `agent-device close`, and
`agent-device disconnect` if a remote session was connected. If you started Metro separately, ask
before stopping it.
</cleanup>
