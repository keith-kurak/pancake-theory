import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { breakfastActions, breakfastStore$ } from "@/store/breakfast-store";
import { useValue } from "@legendapp/state/react";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

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
  const entry = useMemo(
    () => history.find((e) => e.id === id),
    [history, id],
  );

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

  const tintColor = useThemeColor({}, "tint");
  const inputBg = useThemeColor(
    { light: "#f0f0f0", dark: "#333" },
    "background",
  );
  const inputTextColor = useThemeColor({}, "text");

  if (!entry) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit Time" }} />
        <ThemedView style={styles.centered}>
          <ThemedText>Entry not found.</ThemedText>
        </ThemedView>
      </>
    );
  }

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
    breakfastActions.updateHistoryEntry(id, prepMs, cookMs);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: entry.recipeName }} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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
      </ScrollView>
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
  container: {
    padding: 24,
    gap: 16,
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
  saveButton: {
    marginTop: 16,
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
