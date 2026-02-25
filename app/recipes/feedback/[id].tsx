import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { breakfastActions, breakfastStore$ } from "@/store/breakfast-store";
import { useValue } from "@legendapp/state/react";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pendingRecipe = useValue(breakfastStore$.pendingRecipe);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [note, setNote] = useState("");

  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const inputBgColor = useThemeColor(
    { light: "#f0f0f0", dark: "#333" },
    "background",
  );
  const insets = useSafeAreaInsets();

  // If no pending recipe or wrong recipe, redirect
  if (!pendingRecipe || pendingRecipe.recipeId !== id) {
    return (
      <>
        <Stack.Screen options={{ title: "Feedback" }} />
        <ThemedView style={styles.centered}>
          <ThemedText>No active recipe found.</ThemedText>
        </ThemedView>
      </>
    );
  }

  const handleStarPress = (starValue: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Toggle off if same star is tapped again
    setRating(rating === starValue ? undefined : starValue);
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
    breakfastActions.completePendingRecipe({
      rating,
      note: note.trim() || undefined,
    });
    router.replace("/(tabs)/history");
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    breakfastActions.completePendingRecipe();
    router.replace("/(tabs)/history");
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "How did it go?",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor }}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.recipeName}>
          {pendingRecipe.recipeName}
        </ThemedText>

        <ThemedView style={styles.section}>
          <ThemedView style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => handleStarPress(star)}
                style={styles.starButton}
              >
                <ThemedText
                  style={[
                    styles.star,
                    {
                      color: rating && star <= rating ? "#FFD700" : textColor,
                      opacity: rating && star <= rating ? 1 : 0.3,
                    },
                  ]}
                >
                  ★
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
          <ThemedText style={styles.ratingHint}>
            {rating
              ? ["", "Disaster", "Not great", "Okay", "Good", "Perfect!"][
                  rating
                ]
              : "Tap to rate"}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Add a note</ThemedText>
          <TextInput
            style={[
              styles.noteInput,
              { backgroundColor: inputBgColor, color: textColor },
            ]}
            value={note}
            onChangeText={setNote}
            placeholder="Any notes about this cook?"
            placeholderTextColor={textColor + "60"}
            multiline
            maxLength={500}
          />
        </ThemedView>

        <ThemedView style={styles.buttonsContainer}>
          <Pressable
            onPress={handleDone}
            style={[styles.doneButton, { backgroundColor: tintColor }]}
          >
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText style={[styles.skipButtonText, { color: textColor }]}>
              Skip
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  recipeName: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  section: {
    gap: 12,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 40,
    lineHeight: 40,
  },
  ratingHint: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
  },
  noteInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
  },
  buttonsContainer: {
    gap: 12,
    marginTop: 8,
    backgroundColor: "transparent",
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
