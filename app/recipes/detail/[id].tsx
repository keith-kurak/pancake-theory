import { DirectionItem } from "@/components/direction-item";
import { IngredientItem } from "@/components/ingredient-item";
import { RecipeTimer } from "@/components/recipe-timer";
import { ScaleSlider } from "@/components/scale-slider";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getRecipeById } from "@/data/recipes";
import { useThemeColor } from "@/hooks/use-theme-color";
import { breakfastActions, breakfastStore$ } from "@/store/breakfast-store";
import { showConfirmDialog } from "@/utils/confirm-dialog";
import { formatAmount, scaleIngredient } from "@/utils/recipe-scaler";
import { useValue } from "@legendapp/state/react";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
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
  const notesInputRef = useRef<TextInput>(null);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    breakfastActions.saveRecipeNotes(id, notes);
    setIsEditingNotes(false);
    notesInputRef.current?.blur();
  };

  const handleEditNotes = () => {
    if (!isActive) return; // Only allow editing in active mode
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditingNotes(true);
    // Focus the input after state updates
    setTimeout(() => {
      notesInputRef.current?.focus();
    }, 100);
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
          <ScrollView style={styles.content}>
            <ThemedView style={{ backgroundColor }}>
              {isActive && pendingRecipeValue && (
                <RecipeTimer startTime={pendingRecipeValue.startTime} />
              )}

              <ScaleSlider
                value={scaleFactor}
                onValueChange={setScaleFactor}
                disabled={!isActive}
              />

              <ThemedView style={styles.ingredientsList}>
                {recipe.ingredients.map((ingredient, index) => {
                  const scaledAmount = scaleIngredient(
                    ingredient.amount,
                    scaleFactor
                  );
                  const formattedAmount = formatAmount(scaledAmount);

                  return (
                    <IngredientItem
                      key={index}
                      name={ingredient.name}
                      amount={formattedAmount}
                      unit={ingredient.unit}
                      checked={checkedIngredients.has(index)}
                      onToggle={() => toggleIngredient(index)}
                    />
                  );
                })}
              </ThemedView>
            </ThemedView>
          </ScrollView>
        )}

        {activeTab === "directions" && (
          <ScrollView style={styles.content}>
            <ThemedView style={styles.directionsList}>
              {recipe.directions.map((direction, index) => (
                <DirectionItem
                  key={index}
                  stepNumber={index + 1}
                  instruction={direction}
                />
              ))}
            </ThemedView>
          </ScrollView>
        )}

        {activeTab === "notes" && (
          <>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.content}
              keyboardVerticalOffset={100}
            >
              <ThemedView style={[styles.notesContainer, { backgroundColor }]}>
                <TextInput
                  ref={notesInputRef}
                  style={[
                    styles.notesInput,
                    {
                      color: textColor,
                      opacity: isEditingNotes ? 1 : 0.7,
                    },
                  ]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this recipe..."
                  placeholderTextColor={textColor + "80"}
                  multiline
                  textAlignVertical="top"
                  editable={isEditingNotes}
                />
                {isEditingNotes && (
                  <Pressable
                    onPress={handleDoneEditing}
                    style={[
                      styles.doneCheckmark,
                      { backgroundColor: tintColor },
                    ]}
                  >
                    <IconSymbol name="checkmark" size={20} color="white" />
                  </Pressable>
                )}
              </ThemedView>
            </KeyboardAvoidingView>

            {!isEditingNotes && isActive && (
              <Pressable
                onPress={handleEditNotes}
                style={[
                  styles.editFab,
                  { backgroundColor: tintColor, bottom: insets.bottom + 16 },
                ]}
              >
                <IconSymbol name="pencil" size={24} color="white" />
              </Pressable>
            )}
          </>
        )}

        {/* Action Buttons */}
        {mode === "viewing" && (
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

        {mode === "active" && activeTab === "ingredients" && (
          <ThemedView
            style={[styles.buttonContainer, { marginBottom: insets.bottom }]}
          >
            {allIngredientsChecked ? (
              <Pressable
                onPress={handleMadeIt}
                style={[styles.actionButton, { backgroundColor: tintColor }]}
              >
                <ThemedText
                  style={[styles.actionButtonText, { color: textColor }]}
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

        {mode === "pending-other" && (
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
  content: {
    flex: 1,
  },
  ingredientsList: {
    paddingVertical: 8,
  },
  directionsList: {
    paddingVertical: 8,
  },
  notesContainer: {
    //padding: 16,
    flex: 1,
  },
  notesInput: {
    padding: 16,
    fontSize: 16,
    flex: 1,
  },
  editFab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  doneCheckmark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  madeItButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  madeItText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});
