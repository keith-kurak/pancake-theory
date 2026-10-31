# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**pancake-theory** is an Expo React Native application using file-based routing with expo-router. The project uses:
- **React 19.1.0** with React Compiler enabled
- **React Native 0.81.5**
- **Expo SDK 54**
- **New Architecture enabled** (newArchEnabled: true)
- **Typed Routes** (experiments.typedRoutes: true)
- **Edge-to-edge Android** (android.edgeToEdgeEnabled: true)

The app is configured for multi-platform deployment (iOS, Android, Web) with automatic theming support.

## Development Commands

Two tools divide the work, and they do not overlap:

- **`@expo/agent-cli`** owns the project — dev server, installs, prebuild, lint,
  typecheck, doctor, and the `status` report. Use `bunx` rather than `npx`: this repo has
  a `bun.lock`. The generated block in **AGENTS.md** is the full reference, and
  `bunx @expo/agent-cli help workflow` explains the order and the exit codes.
- **`agent-device`** owns anything on a device — launching the app, reading the screen,
  tapping, typing, screenshots. See `.claude/rules/agent-device.md`. Prefer it over
  agent-cli's `runtime:*`, `navigate`, and `smoke` commands.

Most agent-cli commands accept `--json`.

### Starting the Development Server
```bash
bunx @expo/agent-cli dev --ios        # Plan it, then get the app onto a device
bunx @expo/agent-cli dev --ios --plan # Print the plan without running it
bunx @expo/agent-cli start            # Just the dev server, no planning
bunx @expo/agent-cli dev --detach     # Do not block the terminal
bunx @expo/agent-cli dev:logs         # Read what a detached server printed
bunx @expo/agent-cli dev:stop         # Stop it
```

The `npm start` / `npm run ios` scripts in **package.json** still work and still set
`APP_VARIANT` and the MCP flag. Reach for them when you want those exact env vars;
otherwise prefer the commands above.

### Platform-Specific Development
```bash
bunx @expo/agent-cli dev --android    # Android
bunx @expo/agent-cli dev --web        # Web
bunx @expo/agent-cli run:ios          # Build and run native iOS
bunx @expo/agent-cli run:android      # Build and run native Android
bunx @expo/agent-cli prebuild         # Generate the native projects
```

### Code Quality & Utilities
```bash
bunx @expo/agent-cli typecheck        # Type-check; exit 20 with diagnostics, 0 when clean
bunx @expo/agent-cli lint             # ESLint
bunx @expo/agent-cli doctor           # Dependency and config diagnosis
bunx @expo/agent-cli install <pkg>    # Install with SDK-compatible resolution
bunx @expo/agent-cli install --fix    # Repair incompatible versions
npm run reset-project                 # Move starter code to app-example/
```

### Understanding a Change
```bash
bunx @expo/agent-cli status                    # Where the project is, and what happens next
bunx @expo/agent-cli status --explain          # Which sources changed, whether it can ship
                                               # over the air, whether EAS has a matching build
bunx @expo/agent-cli status --assert js-only   # Gate: exit 20 when a change costs more than
                                               # the class named, 22 when nothing was measured
```

### Production
```bash
npx eas-cli@latest build --platform ios -s       # Build and submit to App Store
npx eas-cli@latest build --platform android -s   # Build and submit to Play Store
bunx @expo/agent-cli export -p web && npx eas-cli@latest deploy  # Deploy web to EAS Hosting
```

EAS builds, submissions, updates, and workflows stay on `eas-cli`; agent-cli does not
cover them.

## Architecture

### Project Structure

```
pancake-theory/
├── app/                      # File-based routing (expo-router)
│   ├── _layout.tsx          # Root layout with theme/navigation setup
│   ├── (tabs)/              # Tab navigation group
│   │   ├── _layout.tsx      # Tab bar configuration
│   │   ├── index.tsx        # Home tab
│   │   └── explore.tsx      # Explore tab
│   └── modal.tsx            # Modal screen example
├── components/              # Reusable UI components
│   ├── ui/                  # UI-specific components
│   │   ├── icon-symbol.tsx  # Cross-platform icons
│   │   ├── icon-symbol.ios.tsx  # iOS SF Symbols implementation
│   │   └── collapsible.tsx  # Collapsible sections
│   ├── themed-text.tsx      # Theme-aware text wrapper
│   ├── themed-view.tsx      # Theme-aware view wrapper
│   ├── parallax-scroll-view.tsx  # Scrollable header
│   ├── haptic-tab.tsx       # Tab with haptic feedback
│   ├── external-link.tsx    # External link handler
│   └── hello-wave.tsx       # Animated wave component
├── hooks/                   # Custom React hooks
│   ├── use-color-scheme.ts  # Color scheme detection (native)
│   ├── use-color-scheme.web.ts  # Color scheme detection (web)
│   └── use-theme-color.ts   # Theme-aware color resolver
├── constants/
│   └── theme.ts             # Color and font definitions
├── assets/                  # Images, fonts, etc.
├── scripts/
│   └── reset-project.js     # Project reset utility
├── app.json                 # Expo configuration
├── package.json
├── tsconfig.json            # TypeScript config with @/ alias
├── CLAUDE.md                # This file
└── AGENTS.md                # AI agent onboarding guide
```

### Routing System (expo-router)

This project uses **file-based routing** where the file structure defines the navigation structure:

#### Route Notation
- **Static routes**: `about.tsx` → `/about`
- **Dynamic routes**: `[id].tsx` → `/123` (use `useLocalSearchParams()` to access params)
- **Route groups**: `(tabs)/settings.tsx` → `/settings` (parentheses don't affect URL)
- **Index files**: `index.tsx` is the default route for its directory
- **Layout files**: `_layout.tsx` defines navigation structure for child routes
- **Modal routes**: Use `presentation: 'modal'` in Stack.Screen options

#### Current Routes
- `/` - Home tab (app/(tabs)/index.tsx)
- `/explore` - Explore tab (app/(tabs)/explore.tsx)
- `/modal` - Modal example (app/modal.tsx)

#### Typed Routes
The project has `experiments.typedRoutes: true` enabled, which provides:
- Type-safe navigation with autocomplete
- Compile-time route validation
- Automatic route type generation

Use the `href` prop with type safety:
```tsx
import { Link } from 'expo-router';

<Link href="/explore">Go to Explore</Link>
<Link href={{ pathname: '/modal', params: { id: '123' } }}>Open Modal</Link>
```

### Theming System

The app supports automatic light/dark mode switching:

#### Theme Structure
- **constants/theme.ts** - Defines `Colors` object with `light` and `dark` themes
- **hooks/use-color-scheme.ts** - Detects system color scheme (platform-specific)
- **hooks/use-theme-color.ts** - Resolves colors based on current theme

#### Using Theme Colors
```tsx
import { useThemeColor } from '@/hooks/use-theme-color';

// In a component:
const backgroundColor = useThemeColor({}, 'background');
```

#### Themed Components
Pre-built theme-aware components:
- `<ThemedText>` - Automatically styled text
- `<ThemedView>` - Automatically styled view

The root layout (app/_layout.tsx) wraps the app with React Navigation's `ThemeProvider`.

### Component Organization

#### Best Practices
- **Route components only in /app**: Keep route files (screens) in the `/app` directory
- **Reusable components in /components**: All shared components go here
- **UI primitives in /components/ui**: Low-level UI components
- **Platform-specific code**: Use `.ios.tsx`, `.android.tsx`, `.web.tsx` extensions

#### Example: icon-symbol Component
The project demonstrates platform-specific implementations:
- `icon-symbol.tsx` - Default cross-platform implementation
- `icon-symbol.ios.tsx` - iOS-specific using native SF Symbols (expo-symbols)

### Path Aliases

The project uses TypeScript path aliases configured in tsconfig.json:
- **@/** - Root directory alias

Example usage:
```tsx
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
```

### Platform-Specific Code

Use platform-specific file extensions for platform-specific implementations:
- `.ios.tsx` / `.ios.ts` - iOS only
- `.android.tsx` / `.android.ts` - Android only
- `.web.tsx` / `.web.ts` - Web only
- `.native.tsx` / `.native.ts` - iOS + Android (not web)

The bundler automatically selects the correct file at build time.

## Configuration

### Expo Configuration (app.json)

Key settings in app.json:
```json
{
  "expo": {
    "name": "pancake-theory",
    "slug": "pancake-theory",
    "scheme": "pancaketheory",          // Deep linking: pancaketheory://
    "userInterfaceStyle": "automatic",   // Supports light/dark mode
    "newArchEnabled": true,              // New React Native Architecture
    "android": {
      "edgeToEdgeEnabled": true,         // Android edge-to-edge UI
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static"                 // Static export for web
    },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { /* splash config */ }]
    ],
    "experiments": {
      "typedRoutes": true,               // Type-safe routing
      "reactCompiler": true              // React 19 Compiler
    }
  }
}
```

### TypeScript

The project uses **strict TypeScript mode**. All new code should be properly typed.

Key tsconfig.json settings:
- Strict mode enabled
- Path alias: `@/*` → `./*`
- React JSX runtime

### ESLint

The project uses Expo's ESLint configuration (`eslint-config-expo`).

VS Code is configured to:
- Auto-fix on save
- Organize imports on save
- Sort members on save

## Development Guidelines

### React 19 Best Practices
- Use **function components** with hooks
- Leverage the **React Compiler** (enabled via experiments.reactCompiler)
- Proper **dependency arrays** in useEffect/useCallback/useMemo
- Use **Error Boundaries** for production error handling
- Minimize re-renders with proper memoization

### Expo-Specific Best Practices
- Use **expo install** instead of npm/yarn for Expo packages (ensures compatibility)
- Use **expo-image** for optimized image loading
- Use **expo-router** Link/router for navigation (not React Navigation directly)
- Use **expo-haptics** for tactile feedback
- Use **expo-symbols** for iOS SF Symbols support

### Navigation Patterns
```tsx
// Using Link component
import { Link } from 'expo-router';
<Link href="/explore">Navigate</Link>

// Using router programmatically
import { router } from 'expo-router';
router.push('/explore');
router.back();
```

### Accessing Route Parameters
```tsx
import { useLocalSearchParams } from 'expo-router';

export default function Screen() {
  const { id } = useLocalSearchParams();
  return <ThemedText>{id}</ThemedText>;
}
```

### Deep Linking
The app supports deep linking with the custom scheme:
- **pancaketheory://** (configured in app.json)

All routes are automatically deep-linkable via expo-router.

## MCP Integration

The project has **expo-mcp** configured (v0.1.13) for Model Context Protocol support.

The `npm start` script includes: `EXPO_UNSTABLE_MCP_SERVER=1 APP_VARIANT=DEV npx expo start`

This enables advanced tooling and AI-assisted development features. For driving the app on
a device, prefer the `agent-device` MCP server over expo-mcp's `automation_*` tools.

## Code Style

### Naming Conventions
- **Components**: PascalCase (e.g., `ThemedText.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useThemeColor.ts`)
- **Constants**: PascalCase for objects, UPPER_SNAKE_CASE for primitives
- **Files**: kebab-case for utilities, PascalCase for components

### File Organization
- One component per file
- Co-locate related files (e.g., component + styles + tests)
- Use index files sparingly (prefer explicit imports)

### Comments
- Use JSDoc for public APIs
- Explain **why**, not **what** (code should be self-documenting)
- Document complex business logic

## Testing & Debugging

### Available Tools
- **agent-device** - Drive the app on a simulator, emulator, or phone. The tool for any
  on-device check. See `.claude/rules/agent-device.md`.
- **`bunx @expo/agent-cli smoke --ios`** - Prove the app boots and nothing threw
- **`bunx @expo/agent-cli runtime:errors`** - Collect runtime errors over a window
- **`bunx @expo/agent-cli doctor`** - Health checks for the project
- **Expo Go** - Not compatible with this project; it needs a development build

### Debugging Tips
- Use `console.log` for development debugging
- Use `console.warn` for deprecation notices
- Use `console.error` for errors
- Implement Error Boundaries for production

## Common Tasks

### Adding a New Route
1. Create a file in `/app` (e.g., `app/profile.tsx`)
2. Export a default component
3. Route is automatically available at `/profile`

### Adding a New Component
1. Create file in `/components` (e.g., `components/button.tsx`)
2. Use `@/` alias for imports
3. Make it theme-aware if it uses colors

### Adding Platform-Specific Code
1. Create base implementation (e.g., `feature.tsx`)
2. Add platform-specific version (e.g., `feature.ios.tsx`)
3. Import using base name - bundler selects correct file

### Installing New Dependencies
```bash
npx expo install package-name  # Ensures version compatibility
npx expo install --check       # Verify all packages are compatible
```

## Troubleshooting

### Cache Issues
```bash
npx expo start --clear
```

### Dependency Issues
```bash
npx expo install --fix
npx expo doctor
```

### Type Errors
```bash
npx tsc --noEmit  # Check types without building
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Native Documentation](https://reactnative.dev/)
- [React 19 Documentation](https://react.dev/)
- [EAS Documentation](https://docs.expo.dev/eas/)

## Project Metadata

- **EAS Project ID**: 1de013cf-b8b2-4ac3-9e4d-dd70bfd4892e
- **Owner**: expo-production
- **Custom URL Scheme**: pancaketheory://

@AGENTS.md
