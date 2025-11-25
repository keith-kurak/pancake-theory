import { DirectionsTab } from "@/components/recipe-tabs/directions-tab";
import { IngredientsTab } from "@/components/recipe-tabs/ingredients-tab";
import { NotesTab } from "@/components/recipe-tabs/notes-tab";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getRecipeById } from "@/data/recipes";
import { useThemeColor } from "@/hooks/use-theme-color";
import { breakfastActions, breakfastStore$ } from "@/store/breakfast-store";
import { showConfirmDialog } from "@/utils/confirm-dialog";
import { useValue } from "@legendapp/state/react";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabType = "ingredients" | "directions" | "notes";
type RecipeMode = "viewing" | "active" | "pending-other";

export default function RecipeDetailScreen() {
  const { id, scale } = useLocalSearchParams<{
    id: string;
    scale?: string;
  }>();
  const recipe = getRecipeById(id);

  // Observe pending recipe from store
  const pendingRecipeValue = useValue(breakfastStore$.pendingRecipe);

  // Determine recipe mode
  const mode: RecipeMode = useMemo(() => {
    if (!pendingRecipeValue) return "viewing";
    if (pendingRecipeValue.recipeId === id) return "active";
    return "pending-other";
  }, [pendingRecipeValue, id]);

  const isActive = mode === "active";

  // Initialize state from pending recipe if active, otherwise use defaults
  const initialScale = useMemo(() => {
    if (isActive && pendingRecipeValue) return pendingRecipeValue.scaleFactor;
    if (scale) return parseFloat(scale);
    return 1;
  }, [isActive, pendingRecipeValue, scale]);

  const initialChecked = useMemo(() => {
    if (isActive && pendingRecipeValue) {
      return new Set(pendingRecipeValue.checkedIngredients);
    }
    return new Set<number>();
  }, [isActive, pendingRecipeValue]);

  const [activeTab, setActiveTab] = useState<TabType>("ingredients");
  const [scaleFactor, setScaleFactor] = useState(initialScale);
  const [checkedIngredients, setCheckedIngredients] = useState(initialChecked);
  const [notes, setNotes] = useState(() => breakfastActions.getRecipeNotes(id));
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  const insets = useSafeAreaInsets();

  // Sync checked ingredients to store when active
  useEffect(() => {
    if (isActive) {
      breakfastActions.updatePendingRecipeProgress(
        Array.from(checkedIngredients)
      );
    }
  }, [checkedIngredients, isActive]);

  // Sync scale factor to store when active
  useEffect(() => {
    if (isActive) {
      breakfastActions.updatePendingRecipeScale(scaleFactor);
    }
  }, [scaleFactor, isActive]);

  if (!recipe) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Recipe Not Found",
            headerShown: true,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <ThemedView style={styles.container}>
          <ThemedText>Recipe not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  const allIngredientsChecked =
    checkedIngredients.size === recipe.ingredients.length;

  const toggleIngredient = (index: number) => {
    if (!isActive) return; // Only allow toggling in active mode
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const handleMakeItNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If there's a pending recipe, ask for confirmation
    if (pendingRecipeValue) {
      const confirmed = await showConfirmDialog({
        title: "Start New Recipe?",
        message: `You're already making ${pendingRecipeValue.recipeName}. Cancel that recipe and start this one?`,
        confirmText: "Start This Recipe",
        cancelText: "Keep Making It",
      });

      if (!confirmed) return;
      breakfastActions.cancelPendingRecipe();
    }

    // Start the recipe
    breakfastActions.startRecipe(
      recipe.id,
      recipe.name,
      recipe.type,
      scaleFactor
    );
  };

  const handleContinue = () => {
    // Already in active mode, just a visual confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancelRecipe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const confirmed = await showConfirmDialog({
      title: "Cancel Recipe?",
      message:
        "Are you sure you want to cancel making this recipe? Your progress will be lost.",
      confirmText: "Cancel Recipe",
      cancelText: "Keep Making It",
    });

    if (confirmed) {
      breakfastActions.cancelPendingRecipe();
      router.back();
    }
  };

  const handleMadeIt = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    breakfastActions.completePendingRecipe();
    router.push("/(tabs)/history");
  };

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleDoneEditing = () => {
    breakfastActions.saveRecipeNotes(id, notes);
    setIsEditingNotes(false);
  };

  const handleEditNotes = () => {
    setIsEditingNotes(true);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.name,
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ThemedView style={styles.container}>
        {/* Tab Bar */}
        <ThemedView style={styles.tabBar}>
          <Pressable
            onPress={() => handleTabChange("ingredients")}
            style={[
              styles.tab,
              activeTab === "ingredients" && {
                borderBottomColor: tintColor,
                borderBottomWidth: 2,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "ingredients" && {
                  color: tintColor,
                  fontWeight: "600",
                },
              ]}
            >
              Ingredients
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange("directions")}
            style={[
              styles.tab,
              activeTab === "directions" && {
                borderBottomColor: tintColor,
                borderBottomWidth: 2,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "directions" && {
                  color: tintColor,
                  fontWeight: "600",
                },
              ]}
            >
              Directions
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange("notes")}
            style={[
              styles.tab,
              activeTab === "notes" && {
                borderBottomColor: tintColor,
                borderBottomWidth: 2,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === "notes" && {
                  color: tintColor,
                  fontWeight: "600",
                },
              ]}
            >
              Notes
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Content */}
        {activeTab === "ingredients" && (
          <IngredientsTab
            recipe={recipe}
            scaleFactor={scaleFactor}
            onScaleChange={setScaleFactor}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={toggleIngredient}
            isActive={isActive}
            startTime={pendingRecipeValue?.startTime}
            backgroundColor={backgroundColor}
          />
        )}

        {activeTab === "directions" && <DirectionsTab recipe={recipe} />}

        {activeTab === "notes" && (
          <NotesTab
            notes={notes}
            onNotesChange={setNotes}
            isEditing={isEditingNotes}
            onStartEditing={handleEditNotes}
            onStopEditing={handleDoneEditing}
            tintColor={tintColor}
            textColor={textColor}
            backgroundColor={backgroundColor}
            bottomInset={insets.bottom}
          />
        )}

        {/* Action Buttons - Hidden on Notes tab */}
        {activeTab !== "notes" && mode === "viewing" && (
          <ThemedView
            style={[styles.buttonContainer, { marginBottom: insets.bottom }]}
          >
            <Pressable
              onPress={handleMakeItNow}
              style={[styles.actionButton, { backgroundColor: tintColor }]}
            >
              <ThemedText style={styles.actionButtonText}>
                Make it now?
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {activeTab !== "notes" && mode === "active" && activeTab === "ingredients" && (
          <ThemedView
            style={[styles.buttonContainer, { marginBottom: insets.bottom }]}
          >
            {allIngredientsChecked ? (
              <Pressable
                onPress={handleMadeIt}
                style={[styles.actionButton, { backgroundColor: tintColor }]}
              >
                <ThemedText
                  style={[styles.actionButtonText]}
                >
                  I made it!
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleCancelRecipe}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: tintColor,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.actionButtonText, { color: tintColor }]}
                >
                  Cancel Recipe
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        )}

        {activeTab !== "notes" && mode === "pending-other" && (
          <ThemedView
            style={[styles.buttonContainer, { marginBottom: insets.bottom }]}
          >
            <Pressable
              onPress={handleMakeItNow}
              style={[styles.actionButton, { backgroundColor: tintColor }]}
            >
              <ThemedText
                style={[styles.actionButtonText, { color: textColor }]}
              >
                Make it now?
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});
