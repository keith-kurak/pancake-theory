import { RecipeCard } from '@/components/recipe-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BREAKFAST_TYPES } from '@/constants/breakfast-ratios';
import { getRecipesByType } from '@/data/recipes';
import type { BreakfastType } from '@/types/breakfast';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

export default function RecipeListScreen() {
  const { food } = useLocalSearchParams<{ food: BreakfastType }>();

  // Get recipes for this breakfast type
  const recipes = getRecipesByType(food);
  const breakfastInfo = BREAKFAST_TYPES[food];

  return (
    <>
      <Stack.Screen
        options={{
          title: breakfastInfo.name,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal'
        }}
      />
      <ThemedView style={styles.container}>
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                No recipes found for {breakfastInfo.name}
              </ThemedText>
            </ThemedView>
          }
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
});
