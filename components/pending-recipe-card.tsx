import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BREAKFAST_TYPES } from '@/constants/breakfast-ratios';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { PendingRecipe } from '@/types/breakfast';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useMemo } from 'react';

interface PendingRecipeCardProps {
  recipe: PendingRecipe;
}

export function PendingRecipeCard({ recipe }: PendingRecipeCardProps) {
  const backgroundColor = useThemeColor(
    { light: '#fff4e6', dark: '#3a2e1a' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#ff9500', dark: '#ff9500' },
    'text'
  );
  const tintColor = useThemeColor({}, 'tint');

  const breakfastInfo = BREAKFAST_TYPES[recipe.recipeType];

  const elapsedTime = useMemo(() => {
    const elapsed = Date.now() - recipe.startTime;
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, [recipe.startTime]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipes/detail/${recipe.recipeId}` as any);
  };

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
        <ThemedView style={[styles.badge, { backgroundColor: borderColor }]}>
          <ThemedText style={styles.badgeText}>In Progress</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.header, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.recipeName} numberOfLines={1}>
            {recipe.recipeName}
          </ThemedText>
          <ThemedText style={[styles.type, { color: tintColor }]}>
            {breakfastInfo.name}
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.footer, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.elapsedTime}>
            Started {elapsedTime} ago
          </ThemedText>
          {recipe.scaleFactor !== 1 && (
            <ThemedText style={styles.scale}>{recipe.scaleFactor}x</ThemedText>
          )}
        </ThemedView>

        <ThemedView style={[styles.progress, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.progressText}>
            Tap to continue →
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    gap: 4,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  type: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  elapsedTime: {
    fontSize: 13,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  scale: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  progress: {
    paddingTop: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
});
