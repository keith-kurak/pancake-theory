import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BREAKFAST_TYPES } from "@/constants/breakfast-ratios";
import { RECIPES } from "@/data/recipes";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { BreakfastType, Recipe } from "@/types/breakfast";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, SectionList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface RecipeSection {
  title: string;
  type: BreakfastType;
  data: Recipe[];
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
        });
      }
    });

    return grouped;
  }, []);

  const handleRecipePress = (recipe: Recipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipes/detail/${recipe.id}` as any);
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <Pressable
      onPress={() => handleRecipePress(item)}
      style={({ pressed }) => [
        styles.recipeCard,
        { backgroundColor: cardBackground, borderColor },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={styles.recipeName}>{item.name}</ThemedText>
      <ThemedText style={[styles.recipeIngredients, { opacity: 0.6 }]}>
        {item.ingredients.length} ingredient
        {item.ingredients.length !== 1 ? "s" : ""}
      </ThemedText>
    </Pressable>
  );

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
      <ThemedText style={[styles.sectionTitle, { color: tintColor }]}>
        {section.title}
      </ThemedText>
      <ThemedText style={[styles.sectionDescription, { color: textColor }]}>
        {BREAKFAST_TYPES[section.type].description}
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <SectionList
        contentInset={{ bottom: insets.bottom }}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipe}
        renderSectionHeader={renderSectionHeader}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
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
  recipeName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  recipeIngredients: {
    fontSize: 13,
  },
});
