import { RecipeMiniPlayer } from "@/components/recipe-mini-player";
import { breakfastStore$ } from "@/store/breakfast-store";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useValue } from "@legendapp/state/react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  const pendingRecipe = useValue(breakfastStore$.pendingRecipe);

  // A pending recipe is a cook in progress for its whole life, prep included —
  // the same span the home screen widget reports as active.
  //
  // iOS only: the tab bar accessory is handled by NativeTabsView.ios, so on
  // Android and web the element is dropped anyway. Guarding here keeps
  // RecipeMiniPlayer (and its usePlacement hook) from mounting where the
  // placement it asks about does not exist.
  const showMiniPlayer = Platform.OS === "ios" && pendingRecipe !== null;

  // The accessory renders twice at once, once per placement, and the two
  // instances share no state. So the clock behind the elapsed time lives here
  // and reaches RecipeMiniPlayer as a prop — one interval, one reading, both
  // placements agreeing. It runs only while a cook is in progress.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!showMiniPlayer) return;
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [showMiniPlayer]);

  return (
    <NativeTabs>
      {showMiniPlayer && pendingRecipe ? (
        <NativeTabs.BottomAccessory key={pendingRecipe.recipeId}>
          <RecipeMiniPlayer recipe={pendingRecipe} now={now} />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="index" unstable_nativeProps={{ tabBarItemAccessibilityLabel: "Chooser" }}>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="slider.horizontal.3" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialIcons}
                  name="tune"
                />
              }
            />
          ),
        })}
        <NativeTabs.Trigger.Label hidden>Chooser</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="browse" unstable_nativeProps={{ tabBarItemAccessibilityLabel: "Browse" }}>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="list.bullet" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialIcons}
                  name="view-list"
                />
              }
            />
          ),
        })}
        <NativeTabs.Trigger.Label hidden>Browse</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history" unstable_nativeProps={{ tabBarItemAccessibilityLabel: "History" }}>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="clock.fill" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialIcons}
                  name="schedule"
                />
              }
            />
          ),
        })}
        <NativeTabs.Trigger.Label hidden>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
