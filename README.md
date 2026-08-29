# Pancake Theory 🥞

Every breakfast batter — pancakes, waffles, crêpes, Dutch babies, popovers, donuts,
clafoutis — is the same three things in different proportions: **flour, liquid, eggs**.
Change the ratio and you change what comes out of the pan.

This app makes that the interface. Set the ratio you want, and it finds the recipes
closest to it. Or start from a recipe and see the ratio behind it.

Built with Expo (SDK 57), React Native 0.86, expo-router, and the New Architecture.
iOS, Android, and web from one codebase.

## Get started

```bash
bun install
bun run start
```

This project uses **bun** — `bun.lock` and `bunfig.toml` are checked in, and CI pins
`bun 1.3.10`. One-off tool invocations still go through `npx` (`npx eas-cli@latest`),
matching what the scripts in `scripts/` do.

`bun run start` runs Metro with the Expo MCP server enabled and `APP_VARIANT=DEV`.
Press `i` or `a` to open a simulator, or scan the QR code with a development build.

This app uses native modules — widgets, SQLite, background tasks, Sentry — so **Expo Go
will not run it**. You need a development build:

```bash
npx eas-cli@latest build --platform ios --profile development-simulator
```

Or build locally with `bun run ios` / `bun run android`.

### Everyday commands

| Command | What it does |
|---|---|
| `bun run start` | Metro dev server |
| `bun run ios` / `bun run android` | Build and run natively |
| `bun run web` | Run in the browser |
| `bun test` | Unit tests |
| `bun run lint` | ESLint |
| `bun run e2e` | Maestro E2E via EAS Workflows |

### Testing on a cloud simulator

To run the app on an EAS-hosted simulator against your local dev server — useful for
sharing a live session, or when you have no local simulator:

```bash
bun run start-dev-for-sim       # tunnelled Metro; copy the https URL it prints
bun run sim --metro-url <url>   # boot the remote simulator, pointed at it
bun run sim:stop                # when you are done
```

Start the dev server **first**. The simulator deep-links itself at that URL on launch, so
starting it first leaves the app on an empty launcher. See
[`scripts/remote-sim.sh`](scripts/remote-sim.sh) for the details.

## How the code is laid out

```
src/
├── app/                  # Routes (expo-router, file-based)
│   ├── (tabs)/           # Ratios, Browse, History
│   ├── recipes/          # Recipe lists and detail
│   └── history/          # Saved bakes, detail and edit
├── components/           # Shared UI
├── constants/            # Theme, and the canonical ratios per breakfast type
├── data/                 # Recipe JSON, one file per recipe
├── store/                # App state (Legend State)
├── utils/                # ratio-matcher.ts — normalise and rank by distance
└── widgets/              # iOS home-screen widget
```

The interesting bit is `src/utils/ratio-matcher.ts`: ratios are normalised to percentages
summing to 100, then compared by Euclidean distance, so "2 flour / 2 liquid / 1 egg"
matches the same recipes as "4 / 4 / 2".

Adding a recipe means dropping a JSON file into `src/data/more-recipes/` and importing it
in `src/data/recipes.ts`.

Conventions for both humans and coding agents live in [`CLAUDE.md`](CLAUDE.md) and
[`AGENTS.md`](AGENTS.md).

## Agentic workflows

This repo can build, revise, and verify its own pull requests. Comment `/build` on an
issue and an agent opens a PR, writes the code, drives it on a cloud simulator, and
reports back with screenshots.

```
issue --/build--> draft PR --agent-start--> built & validated --> ready for review
                     ^                                                   |
                     └────── /agent + agent-revise ─────────────────────┘
                                     /verify + agent-verify --> evidence site
```

- **[Setup guide](.eas/workflows/SETUP.md)** — secrets, GitHub labels, and prerequisites.
  Start here; nothing works until these are in place.
- **[How the workflows work](.eas/workflows/README.md)** — the reference: triggers,
  budgets, failure behaviour, and the design decisions behind them.

## Deployment

```bash
npx eas-cli@latest build --platform ios -s        # build and submit to the App Store
npx eas-cli@latest build --platform android -s    # build and submit to Play
npx expo export -p web && npx eas-cli@latest deploy
```

Day-to-day releases go out as EAS Updates from `main` — see
[`.eas/workflows/`](.eas/workflows/).
