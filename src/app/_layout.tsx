import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import ExpoOtaUpdateMonitor from "@/components/OtaUpdateOverlay";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { registerBackgroundUpdateTask } from "@/utils/background-updates";
import Sentry from "@/utils/sentry";
import { setupWidgetObserver } from "@/utils/widget-updates";
import { Observe, ObserveRoot, useObserve } from "expo-observe";
import { useEffect } from "react";
import {
  KeyboardAvoidingView,
  KeyboardProvider,
} from "react-native-keyboard-controller";

Sentry.init({
  dsn: "https://a3063bc5ba53ceff66706a91d8642e9e@o1310900.ingest.us.sentry.io/4511078323585024",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export const unstable_settings = {
  anchor: "(tabs)",
};

SplashScreen.setOptions({
  duration: 300,
  fade: true,
});

let observeConfig: any = {
  integrations: {
    "expo-router": true,
  },
  dispatchInDebug: true /* a little loud, but helps us generate more test data */,
};

if (process.env.METRICS_ENV === "e2e") {
  observeConfig = {
    ...observeConfig,
    environment: "e2e",
  };
}

Observe.configure(observeConfig);

registerBackgroundUpdateTask();
setupWidgetObserver();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
    setTimeout(() => {
      Observe.dispatchEvents();
    }, 1000);
  }, [markInteractive]);

  return (
    <ObserveRoot>
      <KeyboardProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <KeyboardAvoidingView behavior={"padding"} style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
            <StatusBar style="auto" />
            <ExpoOtaUpdateMonitor />
          </KeyboardAvoidingView>
        </ThemeProvider>
      </KeyboardProvider>
    </ObserveRoot>
  );
}
