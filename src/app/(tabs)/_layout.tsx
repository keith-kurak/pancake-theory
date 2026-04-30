import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { RecipeMiniPlayer } from "@/components/recipe-mini-player";
import { TabBarContext } from "@/contexts/tab-bar-context";
import { breakfastStore$ } from "@/store/breakfast-store";
import { useValue } from "@legendapp/state/react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React, { useState } from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const pendingRecipe = useValue(breakfastStore$.pendingRecipe);

  return (
    <TabBarContext value={{ setIsTabBarHidden }}>
    <NativeTabs hidden={isTabBarHidden}>
      {pendingRecipe && !isTabBarHidden && (
        <NativeTabs.BottomAccessory>
          <RecipeMiniPlayer recipe={pendingRecipe} />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="(chooser)">
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
      <NativeTabs.Trigger name="(browse)" role="search">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="magnifyingglass" />,
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
      <NativeTabs.Trigger name="(history)">
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
    </TabBarContext>
  );
}
