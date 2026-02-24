import { IngredientItem } from "@/components/ingredient-item";
import { RecipeTimer } from "@/components/recipe-timer";
import { ScaleSlider } from "@/components/scale-slider";
import { ThemedView } from "@/components/themed-view";
import { Recipe } from "@/types/breakfast";
import { formatAmount, scaleIngredient } from "@/utils/recipe-scaler";
import { ScrollView, StyleSheet } from "react-native";

interface IngredientsTabProps {
  recipe: Recipe;
  scaleFactor: number;
  onScaleChange: (value: number) => void;
  checkedIngredients: Set<number>;
  onToggleIngredient: (index: number) => void;
  isActive: boolean;
  startTime?: number;
  prepEndTime?: number;
  onSwitchToCook?: () => void;
  onSwitchToPrep?: () => void;
  backgroundColor: string;
}

export function IngredientsTab({
  recipe,
  scaleFactor,
  onScaleChange,
  checkedIngredients,
  onToggleIngredient,
  isActive,
  startTime,
  prepEndTime,
  onSwitchToCook,
  onSwitchToPrep,
  backgroundColor,
}: IngredientsTabProps) {
  return (
    <ScrollView style={styles.content}>
      <ThemedView style={{ backgroundColor }}>
        {isActive && startTime && (
          <RecipeTimer
            startTime={startTime}
            prepEndTime={prepEndTime}
            onSwitchToCook={onSwitchToCook}
            onSwitchToPrep={onSwitchToPrep}
          />
        )}

        <ScaleSlider value={scaleFactor} onValueChange={onScaleChange} />

        <ThemedView style={styles.ingredientsList}>
          {recipe.ingredients.map((ingredient, index) => {
            const scaledAmount = scaleIngredient(
              ingredient.amount,
              scaleFactor,
              ingredient.category,
            );
            const formattedAmount = formatAmount(scaledAmount);

            return (
              <IngredientItem
                key={index}
                name={ingredient.name}
                amount={formattedAmount}
                unit={ingredient.unit}
                checked={checkedIngredients.has(index)}
                onToggle={() => onToggleIngredient(index)}
              />
            );
          })}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  ingredientsList: {
    paddingVertical: 8,
  },
});
