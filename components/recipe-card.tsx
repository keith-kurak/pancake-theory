import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Recipe } from '@/types/breakfast';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const backgroundColor = useThemeColor(
    { light: '#f8f8f8', dark: '#2a2a2a' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#e0e0e0', dark: '#404040' },
    'text'
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipes/detail/${recipe.id}` as any);
  };

  const ingredientCount = recipe.ingredients.length;
  const directionCount = recipe.directions.length;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor, borderColor },
        pressed && styles.pressed,
      ]}
    >
      <ThemedView style={[styles.content, { backgroundColor: 'transparent' }]}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {recipe.name}
        </ThemedText>

        <ThemedView style={[styles.footer, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.detail}>
            {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={styles.detail}>
            {directionCount} step{directionCount !== 1 ? 's' : ''}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
  },
  detail: {
    fontSize: 13,
    opacity: 0.6,
  },
});
