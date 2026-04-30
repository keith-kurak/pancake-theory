import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BREAKFAST_TYPES } from "@/constants/breakfast-ratios";
import { useThemeColor } from "@/hooks/use-theme-color";
import { breakfastStore$ } from "@/store/breakfast-store";
import type { RecipeNote } from "@/types/breakfast";
import { useValue } from "@legendapp/state/react";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = useValue(breakfastStore$.history);
  const userRecipesData = useValue(breakfastStore$.userRecipesData);

  const entry = useMemo(() => history.find((e) => e.id === id), [history, id]);

  const associatedNotes = useMemo(() => {
    if (!entry) return [];
    const recipeData = userRecipesData[entry.recipeId];
    if (!recipeData?.notes) return [];
    return recipeData.notes
      .filter((note) => note.historyEntryId === id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [entry, userRecipesData, id]);

  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const secondaryTextColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "text",
  );
  const cardBgColor = useThemeColor(
    { light: "#f8f8f8", dark: "#2a2a2a" },
    "background",
  );
  const insets = useSafeAreaInsets();

  if (!entry) {
    return (
      <>
        <Stack.Screen options={{ title: "History" }} />
        <ThemedView style={styles.centered}>
          <ThemedText>Entry not found.</ThemedText>
        </ThemedView>
      </>
    );
  }

  const breakfastInfo = BREAKFAST_TYPES[entry.recipeType];

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatNoteTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleViewRecipe = () => {
    router.push({
      pathname: `/recipes/detail/${entry.recipeId}`,
      params: { scale: entry.scaleFactor.toString() },
    } as any);
  };

  const handleEditPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/history/edit/${entry.id}` as any);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: entry.recipeName,
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => (
            <Pressable onPress={handleEditPress} hitSlop={8}>
              <IconSymbol name="pencil" size={20} color={secondaryTextColor} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <ThemedView style={styles.header}>
          <ThemedText style={styles.date}>
            {formatDate(entry.timestamp)}
          </ThemedText>
        </ThemedView>

        {entry.rating && (
          <ThemedView style={[styles.card, { backgroundColor: cardBgColor }]}>
            <ThemedText style={styles.cardTitle}>Rating</ThemedText>
            <ThemedView style={styles.ratingRow}>
              <ThemedText style={styles.stars}>
                {"★".repeat(entry.rating)}
                {"☆".repeat(5 - entry.rating)}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        <ThemedView style={[styles.card, { backgroundColor: cardBgColor }]}>
          <ThemedText style={styles.cardTitle}>Time</ThemedText>
          <ThemedView style={styles.timeGrid}>
            {entry.prepDuration !== undefined && (
              <ThemedView style={styles.timeItem}>
                <ThemedText style={styles.timeValue}>
                  {formatDuration(entry.prepDuration)}
                </ThemedText>
                <ThemedText style={styles.timeLabel}>Prep</ThemedText>
              </ThemedView>
            )}
            {entry.cookDuration !== undefined && (
              <ThemedView style={styles.timeItem}>
                <ThemedText style={styles.timeValue}>
                  {formatDuration(entry.cookDuration)}
                </ThemedText>
                <ThemedText style={styles.timeLabel}>Cook</ThemedText>
              </ThemedView>
            )}
            {entry.cookingDuration !== undefined && (
              <ThemedView style={styles.timeItem}>
                <ThemedText style={styles.timeValue}>
                  {formatDuration(entry.cookingDuration)}
                </ThemedText>
                {entry.prepDuration !== undefined &&
                entry.cookDuration !== undefined ? (
                  <ThemedText style={styles.timeLabel}>Total</ThemedText>
                ) : null}
              </ThemedView>
            )}
          </ThemedView>
          {entry.scaleFactor !== 1 && (
            <ThemedText style={styles.scaleInfo}>
              Made at {Math.round(entry.scaleFactor * 10) / 10}x scale
            </ThemedText>
          )}
        </ThemedView>

        {associatedNotes.length > 0 && (
          <ThemedView style={[styles.card, { backgroundColor: cardBgColor }]}>
            <ThemedText style={styles.cardTitle}>Notes</ThemedText>
            {associatedNotes.map((note: RecipeNote) => (
              <ThemedView key={note.id} style={styles.noteItem}>
                <ThemedText style={styles.noteContent}>
                  {note.content}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        )}

        <Pressable
          onPress={handleViewRecipe}
          style={[styles.viewRecipeButton, { borderColor: tintColor }]}
        >
          <ThemedText style={[styles.viewRecipeText, { color: tintColor }]}>
            View Recipe
          </ThemedText>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  type: {
    fontSize: 16,
    fontWeight: "600",
  },
  date: {
    fontSize: 14,
    opacity: 0.6,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "transparent",
  },
  stars: {
    fontSize: 24,
    color: "#FFD700",
  },
  ratingLabel: {
    fontSize: 16,
    opacity: 0.8,
  },
  timeGrid: {
    flexDirection: "row",
    gap: 24,
    backgroundColor: "transparent",
  },
  timeItem: {
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  timeValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  timeLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  scaleInfo: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: "italic",
  },
  noteItem: {
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
    backgroundColor: "transparent",
  },
  noteContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  noteTimestamp: {
    fontSize: 12,
    opacity: 0.5,
  },
  viewRecipeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 8,
  },
  viewRecipeText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
