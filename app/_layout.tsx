import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import ExpoOtaUpdateMonitor from "@/components/OtaUpdateOverlay";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { KeyboardAvoidingView, Platform } from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

SplashScreen.setOptions({
  duration: 300,
  fade: true,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
      >
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
  );
}
