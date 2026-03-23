import { DirectionItem } from "@/components/direction-item";
import { ThemedView } from "@/components/themed-view";
import { Recipe } from "@/types/breakfast";
import { ScrollView, StyleSheet } from "react-native";

interface DirectionsTabProps {
  recipe: Recipe;
}

export function DirectionsTab({ recipe }: DirectionsTabProps) {
  return (
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
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  directionsList: {
    paddingVertical: 8,
  },
});
