import { DirectionItem } from '@/components/direction-item';
import { IngredientItem } from '@/components/ingredient-item';
import { ScaleSlider } from '@/components/scale-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRecipeById } from '@/data/recipes';
import { useThemeColor } from '@/hooks/use-theme-color';
import { breakfastActions } from '@/store/breakfast-store';
import { formatAmount, scaleIngredient } from '@/utils/recipe-scaler';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabType = 'ingredients' | 'directions';

export default function RecipeDetailScreen() {
  const { id, scale } = useLocalSearchParams<{ id: string; scale?: string }>();
  const recipe = getRecipeById(id);

  const initialScale = scale ? parseFloat(scale) : 1;

  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [scaleFactor, setScaleFactor] = useState(initialScale);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const insets = useSafeAreaInsets();

  if (!recipe) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Recipe Not Found',
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
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
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const handleMadeIt = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Add to history
    breakfastActions.addToHistory({
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeType: recipe.type,
      scaleFactor,
    });

    // Navigate to History tab
    router.push('/(tabs)/history');
  };

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.name,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ThemedView style={styles.container}>
        {/* Tab Bar */}
        <ThemedView style={styles.tabBar}>
          <Pressable
            onPress={() => handleTabChange('ingredients')}
            style={[
              styles.tab,
              activeTab === 'ingredients' && {
                borderBottomColor: tintColor,
                borderBottomWidth: 2,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'ingredients' && {
                  color: tintColor,
                  fontWeight: '600',
                },
              ]}
            >
              Ingredients
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('directions')}
            style={[
              styles.tab,
              activeTab === 'directions' && {
                borderBottomColor: tintColor,
                borderBottomWidth: 2,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'directions' && {
                  color: tintColor,
                  fontWeight: '600',
                },
              ]}
            >
              Directions
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Content */}
        <ScrollView style={styles.content}>
          {activeTab === 'ingredients' && (
            <ThemedView style={{ backgroundColor }}>
              <ScaleSlider value={scaleFactor} onValueChange={setScaleFactor} />

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
          )}

          {activeTab === 'directions' && (
            <ThemedView style={styles.directionsList}>
              {recipe.directions.map((direction, index) => (
                <DirectionItem
                  key={index}
                  stepNumber={index + 1}
                  instruction={direction}
                />
              ))}
            </ThemedView>
          )}
        </ScrollView>

        {/* I Made It Button */}
        {activeTab === 'ingredients' && allIngredientsChecked && (
          <ThemedView style={[styles.buttonContainer, { marginBottom: insets.bottom }]}>
            <Pressable
              onPress={handleMadeIt}
              style={[styles.madeItButton, { backgroundColor: tintColor }]}
            >
              <ThemedText style={styles.madeItText}>I made it!</ThemedText>
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
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
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
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  madeItButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  madeItText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});
