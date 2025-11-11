import { HistoryEntry } from "@/components/history-entry";
import { PendingRecipeCard } from "@/components/pending-recipe-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { breakfastStore$ } from "@/store/breakfast-store";
import type { HistoryEntry as HistoryEntryType } from "@/types/breakfast";
import { observer, useValue } from "@legendapp/state/react";
import { reloadAsync, useUpdates } from "expo-updates";
import { useMemo, useState } from "react";
import { Button, FlatList, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { isUpdatePending } = useUpdates();

  // Get the history and pending recipe from the store
  const history = useValue(breakfastStore$.history);
  const pendingRecipe = useValue(breakfastStore$.pendingRecipe);

  // Combine pending recipe and history into a single list
  const displayItems = useMemo(() => {
    const items: { type: "pending" | "history"; data: any }[] = [];

    if (pendingRecipe) {
      items.push({ type: "pending", data: pendingRecipe });
    }

    history.forEach((entry: HistoryEntryType) => {
      items.push({ type: "history", data: entry });
    });

    return items;
  }, [history, pendingRecipe]);

  const onRefresh = () => {
    setRefreshing(true);
    // Force a re-render by toggling refresh state
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyContainer}>
      <ThemedText style={styles.emptyTitle}>No History Yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Complete a recipe to see it appear here!
      </ThemedText>
      <ThemedText style={styles.emptyHint}>
        Go to the Chooser tab, find a recipe, and tap "I made it!" when you're
        done.
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          History
        </ThemedText>
        {isUpdatePending && (
          <Button
            onPress={async () => {
              setRefreshing(true);
              await reloadAsync();
              setRefreshing(false);
            }}
            title="Restart to Update"
          />
        )}
        {history.length > 0 && (
          <ThemedText style={styles.subtitle}>
            {history.length} recipe{history.length !== 1 ? "s" : ""} made
          </ThemedText>
        )}
      </ThemedView>

      <FlatList
        data={displayItems}
        keyExtractor={(item, index) =>
          item.type === "pending" ? "pending" : item.data.id
        }
        renderItem={({ item }) =>
          item.type === "pending" ? (
            <PendingRecipeCard recipe={item.data} />
          ) : (
            <HistoryEntry entry={item.data} />
          )
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={() => <ThemedView style={{ height: 80 }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    alignItems: "center",
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
    opacity: 0.7,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.5,
    marginTop: 16,
  },
});

export default observer(HistoryScreen);
