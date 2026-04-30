import { BREAKFAST_TYPES } from "@/constants/breakfast-ratios";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { PendingRecipe } from "@/types/breakfast";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface RecipeMiniPlayerProps {
  recipe: PendingRecipe;
}

function formatElapsed(startTime: number, now: number) {
  const elapsed = now - startTime;
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function RecipeMiniPlayer({ recipe }: RecipeMiniPlayerProps) {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const isInline = placement === "inline";

  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const breakfastInfo = BREAKFAST_TYPES[recipe.recipeType];
  const elapsed = formatElapsed(recipe.startTime, now);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipes/detail/${recipe.recipeId}` as any);
  };

  if (isInline) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.inline, pressed && styles.pressed]}
      >
        <Text style={[styles.inlineName, { color: textColor }]} numberOfLines={1}>
          {recipe.recipeName}
        </Text>
        <View style={styles.inlineDot} />
        <Text style={[styles.inlineTime, { color: tintColor }]}>{elapsed}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {recipe.recipeName}
        </Text>
        <Text style={[styles.subtitle, { color: textColor, opacity: 0.5 }]}>
          {breakfastInfo.name} · {elapsed}
        </Text>
      </View>
      <Text style={[styles.arrow, { color: tintColor }]}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  left: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  arrow: {
    fontSize: 18,
    fontWeight: "600",
  },
  inlineName: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  inlineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#ff9500",
    marginHorizontal: 6,
  },
  inlineTime: {
    fontSize: 12,
    fontWeight: "500",
  },
});
