import { TabBarContext } from "@/contexts/tab-bar-context";
import { Stack } from "expo-router";
import { use } from "react";

export const unstable_settings = {
  browse: {
    initialRouteName: "browse/index",
  },
  history: {
    initialRouteName: "history/index",
  },
};

const ROOT_SCREENS = new Set(["index", "browse/index", "history/index"]);

export default function SharedLayout() {
  const { setIsTabBarHidden } = use(TabBarContext);

  return (
    <Stack
      screenListeners={{
        focus: (e) => {
          const routeName = e.target?.split("-")[0];
          setIsTabBarHidden(!ROOT_SCREENS.has(routeName ?? ""));
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="browse/index" options={{ headerShown: false }} />
      <Stack.Screen name="history/index" options={{ headerShown: false }} />
    </Stack>
  );
}
