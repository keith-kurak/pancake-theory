import { DirectionItem } from '@/components/direction-item';
import { IngredientItem } from '@/components/ingredient-item';
import { ScaleSlider } from '@/components/scale-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getRecipeById } from '@/data/recipes';
import { useThemeColor } from '@/hooks/use-theme-color';
import { breakfastActions } from '@/store/breakfast-store';
import { formatAmount, scaleIngredient } from '@/utils/recipe-scaler';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabType = 'ingredients' | 'directions' | 'notes';

export default function RecipeDetailScreen() {
  const { id, scale } = useLocalSearchParams<{
    id: string;
    scale?: string;
  }>();
  const recipe = getRecipeById(id);

  const initialScale = scale ? parseFloat(scale) : 1;

  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [scaleFactor, setScaleFactor] = useState(initialScale);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [notes, setNotes] = useState(() => breakfastActions.getRecipeNotes(id));
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const notesInputRef = useRef<TextInput>(null);

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

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

  const handleDoneEditing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    breakfastActions.saveRecipeNotes(id, notes);
    setIsEditingNotes(false);
    notesInputRef.current?.blur();
  };

  const handleEditNotes = () => {
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

          <Pressable
            onPress={() => handleTabChange('notes')}
            style={[
              styles.tab,
              activeTab === 'notes' && {
                borderBottomColor: tintColor,
                borderBottomWidth: 2,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'notes' && {
                  color: tintColor,
                  fontWeight: '600',
                },
              ]}
            >
              Notes
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Content */}
        {activeTab === 'ingredients' && (
          <ScrollView style={styles.content}>
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
          </ScrollView>
        )}

        {activeTab === 'directions' && (
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

        {activeTab === 'notes' && (
          <>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  placeholderTextColor={textColor + '80'}
                  multiline
                  textAlignVertical="top"
                  editable={isEditingNotes}
                />
                {isEditingNotes && (
                  <Pressable
                    onPress={handleDoneEditing}
                    style={[styles.doneCheckmark, { backgroundColor: tintColor }]}
                  >
                    <IconSymbol name="checkmark" size={20} color="white" />
                  </Pressable>
                )}
              </ThemedView>
            </KeyboardAvoidingView>

            {!isEditingNotes && (
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
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  doneCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
