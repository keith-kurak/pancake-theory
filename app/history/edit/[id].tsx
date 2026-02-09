import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { breakfastActions, breakfastStore$ } from "@/store/breakfast-store";
import { showConfirmDialog } from "@/utils/confirm-dialog";
import { useValue } from "@legendapp/state/react";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function msToHMS(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

function hmsToMs(hours: number, minutes: number, seconds: number) {
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

export default function EditHistoryEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = useValue(breakfastStore$.history);
  const entry = useMemo(() => history.find((e) => e.id === id), [history, id]);

  const initialPrep = useMemo(() => {
    if (!entry) return { hours: 0, minutes: 0, seconds: 0 };
    return msToHMS(entry.prepDuration ?? 0);
  }, [entry]);

  const initialCook = useMemo(() => {
    if (!entry) return { hours: 0, minutes: 0, seconds: 0 };
    const cookMs = entry.cookDuration ?? entry.cookingDuration ?? 0;
    return msToHMS(cookMs);
  }, [entry]);

  const [prepHours, setPrepHours] = useState(String(initialPrep.hours));
  const [prepMinutes, setPrepMinutes] = useState(String(initialPrep.minutes));
  const [prepSeconds, setPrepSeconds] = useState(String(initialPrep.seconds));

  const [cookHours, setCookHours] = useState(String(initialCook.hours));
  const [cookMinutes, setCookMinutes] = useState(String(initialCook.minutes));
  const [cookSeconds, setCookSeconds] = useState(String(initialCook.seconds));

  const [rating, setRating] = useState<number | undefined>(entry?.rating);

  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const inputBg = useThemeColor(
    { light: "#f0f0f0", dark: "#333" },
    "background",
  );
  const inputTextColor = useThemeColor({}, "text");
  const insets = useSafeAreaInsets();

  if (!entry) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit" }} />
        <ThemedView style={styles.centered}>
          <ThemedText>Entry not found.</ThemedText>
        </ThemedView>
      </>
    );
  }

  const handleStarPress = (starValue: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(rating === starValue ? undefined : starValue);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prepMs = hmsToMs(
      parseInt(prepHours, 10) || 0,
      parseInt(prepMinutes, 10) || 0,
      parseInt(prepSeconds, 10) || 0,
    );
    const cookMs = hmsToMs(
      parseInt(cookHours, 10) || 0,
      parseInt(cookMinutes, 10) || 0,
      parseInt(cookSeconds, 10) || 0,
    );
    breakfastActions.updateHistoryEntry(id, {
      prepDuration: prepMs,
      cookDuration: cookMs,
      rating: rating === undefined ? null : rating,
    });
    router.back();
  };

  const handleDelete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const confirmed = await showConfirmDialog({
      title: "Delete Entry?",
      message:
        "Are you sure you want to delete this history entry? This cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      breakfastActions.removeFromHistory(id);
      router.replace("/(tabs)/history");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: entry.recipeName,
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <IconSymbol name="trash" size={20} color="#dc3545" />
            </Pressable>
          ),
        }}
      />
      <View style={styles.screenContainer}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={styles.sectionTitle}>Rating</ThemedText>
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
              ? ["", "Disaster", "Not great", "Okay", "Good", "Perfect!"][rating]
              : "Tap to rate (optional)"}
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>Prep Time</ThemedText>
          <View style={styles.timeRow}>
            <TimeField
              label="h"
              value={prepHours}
              onChangeText={setPrepHours}
              inputBg={inputBg}
              textColor={inputTextColor}
            />
            <TimeField
              label="m"
              value={prepMinutes}
              onChangeText={setPrepMinutes}
              inputBg={inputBg}
              textColor={inputTextColor}
            />
            <TimeField
              label="s"
              value={prepSeconds}
              onChangeText={setPrepSeconds}
              inputBg={inputBg}
              textColor={inputTextColor}
            />
          </View>

          <ThemedText style={styles.sectionTitle}>Cook Time</ThemedText>
          <View style={styles.timeRow}>
            <TimeField
              label="h"
              value={cookHours}
              onChangeText={setCookHours}
              inputBg={inputBg}
              textColor={inputTextColor}
            />
            <TimeField
              label="m"
              value={cookMinutes}
              onChangeText={setCookMinutes}
              inputBg={inputBg}
              textColor={inputTextColor}
            />
            <TimeField
              label="s"
              value={cookSeconds}
              onChangeText={setCookSeconds}
              inputBg={inputBg}
              textColor={inputTextColor}
            />
          </View>
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: tintColor },
              pressed && styles.saveButtonPressed,
            ]}
          >
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function TimeField({
  label,
  value,
  onChangeText,
  inputBg,
  textColor,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  inputBg: string;
  textColor: string;
}) {
  return (
    <View style={styles.timeField}>
      <TextInput
        style={[
          styles.timeInput,
          { backgroundColor: inputBg, color: textColor },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
      />
      <ThemedText style={styles.timeLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
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
    fontSize: 36,
    lineHeight: 40,
  },
  ratingHint: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeInput: {
    width: 56,
    height: 44,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "500",
  },
  timeLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
