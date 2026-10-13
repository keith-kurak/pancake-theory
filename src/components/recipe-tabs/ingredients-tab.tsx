import { IngredientItem } from "@/components/ingredient-item";
import { RecipeTimer } from "@/components/recipe-timer";
import { ScaleSlider } from "@/components/scale-slider";
import { ThemedView } from "@/components/themed-view";
import { breakfastStore$ } from "@/store/breakfast-store";
import { Recipe } from "@/types/breakfast";
import { formatAmount, scaleIngredient } from "@/utils/recipe-scaler";
import { useValue } from "@legendapp/state/react";
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
  const useMetric = useValue(breakfastStore$.useMetric);
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
            const showMetric = useMetric && ingredient.metricAmount != null;
            const baseAmount = showMetric
              ? ingredient.metricAmount!
              : ingredient.amount;
            const scaledAmount = scaleIngredient(
              baseAmount,
              scaleFactor,
              ingredient.category,
            );
            const formattedAmount = formatAmount(scaledAmount);

            return (
              <IngredientItem
                key={index}
                testID={`ingredient-${index}`}
                name={ingredient.name}
                amount={formattedAmount}
                unit={showMetric ? (ingredient.metricUnit ?? "") : ingredient.unit}
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
