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

// Store only persistent data (history)
// Ratios are local state, recipes/breakfast types are static data
interface BreakfastStore {
  history: HistoryEntry[];
}

const initialState: BreakfastStore = {
  history: [],
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

// Actions for managing history
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
};
