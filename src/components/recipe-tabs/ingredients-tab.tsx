import { IngredientItem } from "@/components/ingredient-item";
import { RecipeTimer } from "@/components/recipe-timer";
import { ScaleSlider } from "@/components/scale-slider";
import { ThemedView } from "@/components/themed-view";
import { Recipe } from "@/types/breakfast";
import { breakfastStore$ } from "@/store/breakfast-store";
import { formatAmount, formatMetricAmount, scaleIngredient } from "@/utils/recipe-scaler";
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
  const unitSystem = useValue(breakfastStore$.settings.unitSystem);
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
            const useMetric =
              unitSystem === "metric" &&
              ingredient.metricAmount != null &&
              !!ingredient.metricUnit;
            let formattedAmount = formatAmount(scaledAmount);
            let unit = ingredient.unit;
            if (useMetric) {
              // Eggs scale in whole eggs, so keep the grams in step with that count
              const metricScaled =
                ingredient.category === "eggs" && ingredient.amount
                  ? ingredient.metricAmount! * (scaledAmount / ingredient.amount)
                  : ingredient.metricAmount! * scaleFactor;
              formattedAmount = formatMetricAmount(metricScaled);
              unit = ingredient.metricUnit!;
            }

            return (
              <IngredientItem
                key={index}
                testID={`ingredient-${index}`}
                name={ingredient.name}
                amount={formattedAmount}
                unit={unit}
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
