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

### Starting the Development Server
```bash
npm start                    # Start Metro bundler with MCP server enabled
npx expo start               # Alternative start command
npx expo start --clear       # Clear cache and start fresh
```

### Platform-Specific Development
```bash
npm run ios                  # Start on iOS simulator
npm run android              # Start on Android emulator
npm run web                  # Start web version
npx expo run:ios             # Build and run native iOS
npx expo run:android         # Build and run native Android
```

### Code Quality & Utilities
```bash
npm run lint                 # Run ESLint checks (expo lint)
npx expo install --check     # Check package compatibility
npx expo install --fix       # Fix package version issues
npx expo doctor              # Check project health
npm run reset-project        # Move starter code to app-example/
```

### Production
```bash
npx eas-cli@latest build --platform ios -s       # Build and submit to App Store
npx eas-cli@latest build --platform android -s   # Build and submit to Play Store
npx expo export -p web && npx eas-cli@latest deploy  # Deploy web to EAS Hosting
```

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

The start script includes: `EXPO_UNSTABLE_MCP_SERVER=1 npx expo start`

This enables advanced tooling and AI-assisted development features.

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
- **React Native DevTools** - Use MCP `open_devtools` command
- **Expo Go** - Quick testing on physical devices
- **expo-doctor** - Health checks for the project

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
