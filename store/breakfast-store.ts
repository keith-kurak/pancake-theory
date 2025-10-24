import type { HistoryEntry } from '@/types/breakfast';
import { observable } from '@legendapp/state';
import { observablePersistSqlite } from '@legendapp/state/persist-plugins/expo-sqlite';
import { configureSynced, syncObservable } from '@legendapp/state/sync';
import Storage from 'expo-sqlite/kv-store';

const persistOptions = configureSynced({
    persist: {
        plugin: observablePersistSqlite(Storage)
    },
});

// Store only persistent data (history, recipe notes)
// Ratios are local state, recipes/breakfast types are static data
interface BreakfastStore {
  history: HistoryEntry[];
  recipeNotes: Record<string, string>; // recipeId -> notes
}

const initialState: BreakfastStore = {
  history: [],
  recipeNotes: {},
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

// Actions for managing history and recipe notes
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
};
