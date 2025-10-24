import { BreakfastCard } from "@/components/breakfast-card";
import { RatioSlider } from "@/components/ratio-slider";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type { Ratios } from "@/types/breakfast";
import { findClosestBreakfast } from "@/utils/ratio-matcher";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChooserScreen() {
  const [ratios, setRatios] = useState<Ratios>({
    flour: 50,
    liquid: 50,
    eggs: 50,
  });

  const insets = useSafeAreaInsets();

  // Find the closest breakfast match based on current ratios
  const matchedBreakfast = useMemo(() => {
    return findClosestBreakfast(ratios);
  }, [ratios]);

  const updateFlour = (value: number) => {
    setRatios((prev) => ({ ...prev, flour: value }));
  };

  const updateLiquid = (value: number) => {
    setRatios((prev) => ({ ...prev, liquid: value }));
  };

  const updateEggs = (value: number) => {
    setRatios((prev) => ({ ...prev, eggs: value }));
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            What should I make?
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Adjust the ingredient ratios below
          </ThemedText>
        </ThemedView>

        {/* Matched breakfast card */}
        <ThemedView style={styles.cardContainer}>
          <BreakfastCard type={matchedBreakfast} />
        </ThemedView>

        {/* Sliders at the bottom */}
        <ThemedView style={styles.slidersContainer}>
          <ThemedText type="subtitle" style={styles.slidersTitle}>
            Ingredient Ratios
          </ThemedText>

          <RatioSlider
            label="Flour"
            value={ratios.flour}
            onValueChange={updateFlour}
          />

          <RatioSlider
            label="Liquid"
            value={ratios.liquid}
            onValueChange={updateLiquid}
          />

          <RatioSlider
            label="Eggs"
            value={ratios.eggs}
            onValueChange={updateEggs}
          />
        </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 8,
    alignItems: "center",
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
  },
  slidersContainer: {
    marginTop: 24,
    paddingTop: 16,
    gap: 8,
  },
  slidersTitle: {
    marginBottom: 8,
  },
});
