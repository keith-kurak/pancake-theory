import { Stack } from "expo-router";

export const unstable_settings = {
  browse: {
    initialRouteName: "browse/index",
  },
  history: {
    initialRouteName: "history/index",
  },
};

export default function SharedLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="browse/index" options={{ headerShown: false }} />
      <Stack.Screen name="history/index" options={{ headerShown: false }} />
    </Stack>
  );
}
