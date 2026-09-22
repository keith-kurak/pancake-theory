// The widget ships on iOS only. expo-widgets is excluded from Android autolinking
// (see `expo.autolinking.android.exclude` in package.json), so the Android bundle must
// never import `@/widgets/BreakfastWidget` — `createWidget` resolves the native module
// at import time and would throw on startup.

export function updateBreakfastWidget() {}

export function setupWidgetObserver() {}
