import { BreakfastPieChart } from "@/components/breakfast-pie-chart";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BREAKFAST_TYPES } from "@/constants/breakfast-ratios";
import { RECIPES } from "@/data/recipes";
import { useThemeColor } from "@/hooks/use-theme-color";
import { breakfastStore$ } from "@/store/breakfast-store";
import type { BreakfastType, Recipe } from "@/types/breakfast";
import { useValue } from "@legendapp/state/react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, SectionList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface RecipeSection {
  title: string;
  type: BreakfastType;
  data: Recipe[];
  count: number;
}

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor(
    { light: "#f8f8f8", dark: "#2a2a2a" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#404040" },
    "text"
  );

  // Get history from store
  const history = useValue(breakfastStore$.history);

  // Calculate counts for types and recipes
  const { typeCounts, recipeCounts, totalCount } = useMemo(() => {
    const typeCounts: Record<BreakfastType, number> = {
      pancakes: 0,
      waffles: 0,
      crepes: 0,
      "dutch-baby": 0,
      popover: 0,
      donut: 0,
      clafoutis: 0,
      "breakfast-cake": 0,
    };
    const recipeCounts: Record<string, number> = {};
    let totalCount = 0;

    history.forEach((entry) => {
      typeCounts[entry.recipeType] = (typeCounts[entry.recipeType] || 0) + 1;
      recipeCounts[entry.recipeId] = (recipeCounts[entry.recipeId] || 0) + 1;
      totalCount++;
    });

    return { typeCounts, recipeCounts, totalCount };
  }, [history]);

  // Group recipes by type
  const sections = useMemo(() => {
    const grouped: RecipeSection[] = [];

    // Iterate through all breakfast types in order
    const types: BreakfastType[] = [
      "pancakes",
      "waffles",
      "crepes",
      "dutch-baby",
      "popover",
      "donut",
      "clafoutis",
      "breakfast-cake",
    ];

    types.forEach((type) => {
      const recipesOfType = RECIPES.filter((recipe) => recipe.type === type);
      if (recipesOfType.length > 0) {
        grouped.push({
          title: BREAKFAST_TYPES[type].name,
          type,
          data: recipesOfType,
          count: typeCounts[type] || 0,
        });
      }
    });

    return grouped;
  }, [typeCounts]);

  const handleRecipePress = (recipe: Recipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipes/detail/${recipe.id}` as any);
  };

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const timesMade = recipeCounts[item.id] || 0;
    const wasMade = timesMade > 0;

    return (
      <Pressable
        onPress={() => handleRecipePress(item)}
        style={({ pressed }) => [
          styles.recipeCard,
          { backgroundColor: cardBackground, borderColor },
          pressed && styles.pressed,
        ]}
      >
        <ThemedView style={styles.recipeCardHeader}>
          <ThemedView style={styles.recipeCardText}>
            <ThemedText style={styles.recipeName}>{item.name}</ThemedText>
            <ThemedText style={[styles.recipeIngredients, { opacity: 0.6 }]}>
              {item.ingredients.length} ingredient
              {item.ingredients.length !== 1 ? "s" : ""}
            </ThemedText>
          </ThemedView>
          {wasMade && (
            <ThemedView style={styles.recipeStats}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={tintColor} />
              {timesMade > 1 && (
                <ThemedText style={[styles.timesMade, { color: tintColor }]}>
                  {timesMade}×
                </ThemedText>
              )}
            </ThemedView>
          )}
        </ThemedView>
      </Pressable>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: RecipeSection;
  }) => (
    <ThemedView
      style={[
        styles.sectionHeader,
        { backgroundColor, borderBottomColor: borderColor },
      ]}
    >
      <ThemedView style={styles.sectionHeaderRow}>
        <ThemedText style={[styles.sectionTitle, { color: tintColor }]}>
          {section.title}
        </ThemedText>
        {section.count > 0 && (
          <ThemedText style={[styles.sectionCount, { color: tintColor }]}>
            {section.count} made
          </ThemedText>
        )}
      </ThemedView>
      <ThemedText style={[styles.sectionDescription, { color: textColor }]}>
        {BREAKFAST_TYPES[section.type].description}
      </ThemedText>
    </ThemedView>
  );

  const renderHeader = () => (
    <>
      {totalCount > 0 && (
        <BreakfastPieChart typeCounts={typeCounts} totalCount={totalCount} />
      )}
    </>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <SectionList
        contentInset={{ bottom: insets.bottom }}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipe}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
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
    paddingTop: 0,
  },
  sectionHeader: {
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: "italic",
  },
  recipeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  recipeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  recipeCardText: {
    flex: 1,
    backgroundColor: "transparent",
  },
  recipeName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  recipeIngredients: {
    fontSize: 13,
  },
  recipeStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
  },
  timesMade: {
    fontSize: 14,
    fontWeight: "600",
  },
});
