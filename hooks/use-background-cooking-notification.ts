import { breakfastStore$ } from '@/store/breakfast-store';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

const NOTIFICATION_IDENTIFIER = 'cooking-reminder';
const BACKGROUND_DELAY_SECONDS = 5 * 60; // 5 minutes

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleBackgroundNotification(recipeName: string): Promise<void> {
  const hasPermission = await requestNotificationPermissions();

  if (!hasPermission) {
    return;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('cooking-reminders', {
      name: 'Cooking Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDENTIFIER,
    content: {
      title: 'Continue Cooking',
      body: `Don't forget about your ${recipeName}! Tap to continue.`,
      data: { type: 'cooking-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: BACKGROUND_DELAY_SECONDS,
      channelId: Platform.OS === 'android' ? 'cooking-reminders' : undefined,
    },
  });
}

async function cancelBackgroundNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDENTIFIER);
}

export function useBackgroundCookingNotification() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // App going to background
      if (
        previousState === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        const pendingRecipe = breakfastStore$.pendingRecipe.peek();

        if (pendingRecipe) {
          await scheduleBackgroundNotification(pendingRecipe.recipeName);
        }
      }

      // App coming back to foreground
      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextAppState === 'active'
      ) {
        await cancelBackgroundNotification();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
