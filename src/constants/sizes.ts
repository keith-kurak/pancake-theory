import { Platform } from 'react-native';

/**
 * Sizing constants for consistent layout measurements across the app.
 */
export const Sizes = {
  /**
   * Native tab bar height
   * - iOS: 49pt (standard iOS tab bar height)
   * - Android: 56dp (Material Design bottom navigation height)
   */
  tabBarHeight: Platform.select({
    ios: 49,
    android: 56,
    default: 56,
  }),
  /**
   * Widest that screen content grows. Phones never reach it; on iPad it keeps
   * lists and forms a readable width instead of stretching edge to edge.
   */
  maxContentWidth: 720,
} as const;

/**
 * Spread into a screen's content container style to center it at
 * `Sizes.maxContentWidth` on wide screens.
 */
export const ReadableWidth = {
  width: '100%',
  maxWidth: Sizes.maxContentWidth,
  alignSelf: 'center',
} as const;
