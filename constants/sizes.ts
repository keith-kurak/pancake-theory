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
} as const;
