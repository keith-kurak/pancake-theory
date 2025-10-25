import type { HistoryEntry, PendingRecipe } from '@/types/breakfast';
import { observable } from '@legendapp/state';
import { observablePersistSqlite } from '@legendapp/state/persist-plugins/expo-sqlite';
import { configureSynced, syncObservable } from '@legendapp/state/sync';
import Storage from 'expo-sqlite/kv-store';

const persistOptions = configureSynced({
    persist: {
        plugin: observablePersistSqlite(Storage)
    },
});

// Store only persistent data (history, recipe notes, pending recipe)
// Ratios are local state, recipes/breakfast types are static data
interface BreakfastStore {
  history: HistoryEntry[];
  recipeNotes: Record<string, string>; // recipeId -> notes
  pendingRecipe: PendingRecipe | null;
}

const initialState: BreakfastStore = {
  history: [],
  recipeNotes: {},
  pendingRecipe: null,
};

// Create the observable store
export const breakfastStore$ = observable<BreakfastStore>(initialState);

syncObservable(
    breakfastStore$,
    persistOptions({
        persist: {
            name: 'breakfastStore',
        },
    }),
);

// Actions for managing history, recipe notes, and pending recipes
export const breakfastActions = {
  addToHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };
    breakfastStore$.history.unshift(newEntry);
  },

  clearHistory: () => {
    breakfastStore$.history.set([]);
  },

  removeFromHistory: (id: string) => {
    const currentHistory = breakfastStore$.history.peek();
    const filtered = currentHistory.filter((entry) => entry.id !== id);
    breakfastStore$.history.set(filtered);
  },

  saveRecipeNotes: (recipeId: string, notes: string) => {
    if (notes.trim()) {
      breakfastStore$.recipeNotes[recipeId].set(notes.trim());
    } else {
      // Remove notes if empty
      const currentNotes = breakfastStore$.recipeNotes.peek();
      const { [recipeId]: _, ...rest } = currentNotes;
      breakfastStore$.recipeNotes.set(rest);
    }
  },

  getRecipeNotes: (recipeId: string): string => {
    return breakfastStore$.recipeNotes[recipeId].peek() || '';
  },

  // Pending recipe actions
  startRecipe: (
    recipeId: string,
    recipeName: string,
    recipeType: import('@/types/breakfast').BreakfastType,
    scaleFactor: number
  ) => {
    const pendingRecipe: PendingRecipe = {
      recipeId,
      recipeName,
      recipeType,
      scaleFactor,
      checkedIngredients: [],
      startTime: Date.now(),
    };
    breakfastStore$.pendingRecipe.set(pendingRecipe);
  },

  updatePendingRecipeProgress: (checkedIngredients: number[]) => {
    const pending = breakfastStore$.pendingRecipe.peek();
    if (pending) {
      breakfastStore$.pendingRecipe.checkedIngredients.set(checkedIngredients);
    }
  },

  updatePendingRecipeScale: (scaleFactor: number) => {
    const pending = breakfastStore$.pendingRecipe.peek();
    if (pending) {
      breakfastStore$.pendingRecipe.scaleFactor.set(scaleFactor);
    }
  },

  cancelPendingRecipe: () => {
    breakfastStore$.pendingRecipe.set(null);
  },

  completePendingRecipe: () => {
    const pending = breakfastStore$.pendingRecipe.peek();
    if (pending) {
      const duration = Date.now() - pending.startTime;
      breakfastActions.addToHistory({
        recipeId: pending.recipeId,
        recipeName: pending.recipeName,
        recipeType: pending.recipeType,
        scaleFactor: pending.scaleFactor,
        cookingDuration: duration,
      });
      breakfastStore$.pendingRecipe.set(null);
    }
  },

  getPendingRecipe: (): PendingRecipe | null => {
    return breakfastStore$.pendingRecipe.peek();
  },
};
