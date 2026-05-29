import { RecipeMiniPlayer } from "@/components/recipe-mini-player";
import { breakfastStore$ } from "@/store/breakfast-store";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useValue } from "@legendapp/state/react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

const miniPlayerEnabled = false;

export default function TabLayout() {
  const pendingRecipe = useValue(breakfastStore$.pendingRecipe);

  const showMiniPlayer = pendingRecipe && miniPlayerEnabled;

  return (
    <NativeTabs>
      {showMiniPlayer && (
        <NativeTabs.BottomAccessory key={pendingRecipe.recipeId}>
          <RecipeMiniPlayer recipe={pendingRecipe} />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="index">
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
      <NativeTabs.Trigger name="browse">
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
      <NativeTabs.Trigger name="history">
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
