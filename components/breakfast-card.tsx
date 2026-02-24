import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BREAKFAST_TYPES } from "@/constants/breakfast-ratios";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { BreakfastType } from "@/types/breakfast";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

const CYCLE_INTERVAL = 5000;
const FADE_DURATION = 800;

interface BreakfastCardProps {
  type: BreakfastType;
}

function CyclingImage({
  images,
  style,
}: {
  images: number[];
  style: any;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const indexRef = useRef(0);

  // Reset to primary image when image set changes (new breakfast type)
  useEffect(() => {
    setCurrentIndex(0);
    indexRef.current = 0;
  }, [images]);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      const next = (indexRef.current + 1) % images.length;
      indexRef.current = next;
      setCurrentIndex(next);
    }, CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <Image
      source={images[currentIndex]}
      style={style}
      contentFit="contain"
      transition={{ duration: FADE_DURATION, effect: "cross-dissolve" }}
    />
  );
}

export function BreakfastCard({ type }: BreakfastCardProps) {
  const backgroundColor = useThemeColor(
    { light: "#f8f8f8", dark: "#2a2a2a" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#404040" },
    "text"
  );
  const tintColor = useThemeColor({}, "tint");

  const breakfastInfo = BREAKFAST_TYPES[type];
  const allImages = useMemo(() => {
    const imgs = [breakfastInfo.primaryImage];
    if (breakfastInfo.userImages) {
      imgs.push(...breakfastInfo.userImages);
    }
    return imgs;
  }, [breakfastInfo]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/recipes/${type}` as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor, borderColor },
        pressed && styles.pressed,
      ]}
      testID="make-it-button"
    >
      <ThemedView style={[styles.content, { backgroundColor: "transparent" }]}>
        <ThemedText style={styles.title}>{breakfastInfo.name}</ThemedText>

        <CyclingImage images={allImages} style={styles.image} />

        <ThemedText style={styles.description}>
          {
            breakfastInfo.description +
              (Platform.OS === "android"
                ? " "
                : "") /* italics get cut off on android */
          }
        </ThemedText>

        <ThemedText style={styles.serveWith}>
          {breakfastInfo.serveWith}
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: tintColor }]}>
          Make it →
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "bold",
    textAlign: "center",
  },
  image: {
    flex: 1,
    width: "100%",
  },
  description: {
    fontSize: 16,
    fontStyle: "italic",
    opacity: 0.8,
    textAlign: "center",
  },
  serveWith: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  ratioContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratioLabel: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.7,
  },
  ratioText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
});
