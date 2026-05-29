# AGENTS.md

## Project Overview

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Essential Commands

### Development

```bash
npx expo start                  # Start dev server
npx expo start --clear          # Clear cache and start dev server
npx expo install <package>      # Install packages with compatible versions
npx expo install --check        # Check which installed packages need to be updated
npx expo install --fix          # Automatically update any invalid package versions
```

### Building & Testing

```bash
npx expo prebuild               # Generate native projects
npx expo run:ios                # Build and run on iOS device
npx expo run:android            # Build and run on Android device
npx expo doctor                 # Check project health and dependencies
npm expo lint                   # Run ESLint
```

### Production

```bash
npx eas-cli@latest build --platform ios -s            # Use EAS to build for iOS platform and submit to App Store
npx eas-cli@latest build --platform android -s        # Use EAS to build for Android platform and submit to Google Play Store
npx expo export -p web && npx eas-cli@latest deploy   # Deploy web to EAS Hosting
```

## Development Principles

### Code Style & Standards

- **TypeScript First**: Use TypeScript for all new code with strict type checking
- **Naming Conventions**: Use meaningful, descriptive names for variables, functions, and components
- **Self-Documenting Code**: Write clear, readable code that explains itself; only add comments for complex business logic or design decisions
- **React 19 Patterns**: Follow modern React patterns including:
  - Function components with hooks
  - Enable React Compiler
  - Proper dependency arrays in useEffect
  - Memoization when appropriate (useMemo, useCallback)
  - Error boundaries for better error handling

### Architecture & Best Practices

#### Recommended Libraries

- **Navigation**: `expo-router` for navigation
- **Images**: `expo-image` for optimized image handling and caching
- **Animations**: `react-native-reanimated` for performant animations on native thread
- **Gestures**: `react-native-gesture-handler` for native gesture recognition
- **Storage**: Use `expo-sqlite` for persistent storage, `expo-sqlite/kv-store` for simple key-value storage

### Debugging & Development Tools

#### DevTools Integration

- **React Native DevTools**: Use MCP `open_devtools` command to launch debugging tools
- **Network Inspection**: Monitor API calls and network requests in DevTools
- **Element Inspector**: Debug component hierarchy and styles
- **Performance Profiler**: Identify performance bottlenecks
- **Logging**: Use `console.log` for debugging (remove before production), `console.warn` for deprecation notices, `console.error` for actual errors, and implement error boundaries for production error handling

### Shims for Expo Go Compatibility

Some libraries don't work in Expo Go (the development client). We use shim modules in `src/utils/` that provide noop fallbacks when running in Expo Go and `require()` the real module otherwise.

#### `src/utils/expo-observe.tsx`

All app code must import from `@/utils/expo-observe` instead of `expo-observe` directly. The shim re-exports everything the app uses (`Observe`, `AppMetrics`, `AppMetricsRoot`, `useObserve`) with Expo Go-safe noop fallbacks.

When upgrading `expo-observe`:
- Check that the names used in `require("expo-observe").<name>` still match the package's actual exports. Renamed exports (e.g., `AppMetricsRoot` → `ObserveRoot`) will silently return `undefined` and cause runtime crashes.
- Review the package's `index.d.ts` or changelog for renamed/removed exports.
- If new exports are needed by app code, add them to the shim with a noop fallback in the Expo Go branch.

#### `useMarkRouteInteractive` hook

`src/hooks/use-mark-route-interactive.ts` wraps `useObserve().markInteractive()` in a `useEffect` for screens where time-to-interactive is immediate (no async data loading). It is called in every screen component.

### Testing & Quality Assurance

#### Automated Testing with MCP Tools

- **Component Testing**: Add `testID` props to components for automation
- **Visual Testing**: Use MCP `automation_take_screenshot` to verify UI appearance
- **Interaction Testing**: Use MCP `automation_tap_by_testid` to simulate user interactions
- **View Verification**: Use MCP `automation_find_view_by_testid` to validate component rendering
