import type { HistoryEntry, PendingRecipe, RecipeNote, UserRecipeData } from '@/types/breakfast';
import { observable, Observable, syncState, when } from '@legendapp/state';
import { observablePersistSqlite } from '@legendapp/state/persist-plugins/expo-sqlite';
import { configureSynced, syncObservable } from '@legendapp/state/sync';
import * as Crypto from 'expo-crypto';
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
  // legacy recipe notes (just a text blob per recipe)
  recipeNotes: Record<string, string>; // recipeId -> notes
  // new recipe notes (notes log items per recipe)
  userRecipesData: Record<string, UserRecipeData>;
  pendingRecipe: PendingRecipe | null;
}

const initialState: BreakfastStore = {
  history: [],
  recipeNotes: {},
  pendingRecipe: null,
  userRecipesData: {}
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

// migrate any old notes over to new structure after persistence is loaded
(async function migrateLegacyRecipeNotes() {
  const status$ = syncState(breakfastStore$)
  await when(status$.isPersistLoaded)
  const currentNotes = breakfastStore$.recipeNotes.peek();
  const userRecipesData = breakfastStore$.userRecipesData;

  for (const [recipeId, notes] of Object.entries(currentNotes)) {
    if (notes.trim()) {
      // Check if we already have data for this recipe
      let recipeData = userRecipesData[recipeId];
      if (!recipeData) {
        userRecipesData[recipeId].set({
          recipeId,
          notes: [],
        });
        recipeData = userRecipesData[recipeId];
      }

      // Add a new RecipeNote entry
      recipeData.notes.push({
        id: Crypto.randomUUID(),
        timestamp: Date.now(),
        content: notes.trim(),
      });
    }
  }

  // Clear out legacy notes
  breakfastStore$.recipeNotes.set({});
})();

function getUserRecipeData(recipeId: string): Observable<UserRecipeData> {
  const userRecipesData = breakfastStore$.userRecipesData;
  let recipeData = userRecipesData[recipeId];
  if (!recipeData) {
    userRecipesData[recipeId].set({
      recipeId,
      notes: [],
    });
    recipeData = userRecipesData[recipeId];
  }
  return recipeData;
}

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
    const userRecipeData = getUserRecipeData(recipeId);
    userRecipeData.notes.push(
      {
        id: Crypto.randomUUID(),
        timestamp: Date.now(),
        content: notes,
      }
    )
  },

  deleteRecipeNote: (recipeId: string, noteId: string) => {
    const userRecipeData = getUserRecipeData(recipeId);
    const updatedNotes = userRecipeData.notes.peek().filter(note => note.id !== noteId);
    userRecipeData.notes.set(updatedNotes);
  },

  getRecipeNotes: (recipeId: string): RecipeNote[] => {
     const userRecipeData = getUserRecipeData(recipeId);
     return userRecipeData.notes.get();
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

  switchToCook: () => {
    const pending = breakfastStore$.pendingRecipe.peek();
    if (pending && !pending.prepEndTime) {
      breakfastStore$.pendingRecipe.prepEndTime.set(Date.now());
    }
  },

  switchToPrep: () => {
    const pending = breakfastStore$.pendingRecipe.peek();
    if (pending && pending.prepEndTime) {
      breakfastStore$.pendingRecipe.prepEndTime.set(undefined);
    }
  },

  cancelPendingRecipe: () => {
    breakfastStore$.pendingRecipe.set(null);
  },

  completePendingRecipe: () => {
    const pending = breakfastStore$.pendingRecipe.peek();
    if (pending) {
      const endTime = Date.now();
      const totalDuration = endTime - pending.startTime;

      let prepDuration: number | undefined;
      let cookDuration: number | undefined;

      if (pending.prepEndTime) {
        // User used timer splits
        prepDuration = pending.prepEndTime - pending.startTime;
        cookDuration = endTime - pending.prepEndTime;
      }

      breakfastActions.addToHistory({
        recipeId: pending.recipeId,
        recipeName: pending.recipeName,
        recipeType: pending.recipeType,
        scaleFactor: pending.scaleFactor,
        cookingDuration: totalDuration,
        prepDuration,
        cookDuration,
      });
      breakfastStore$.pendingRecipe.set(null);
    }
  },

  updateHistoryEntry: (id: string, prepDuration: number, cookDuration: number) => {
    const currentHistory = breakfastStore$.history.peek();
    const index = currentHistory.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      breakfastStore$.history[index].prepDuration.set(prepDuration);
      breakfastStore$.history[index].cookDuration.set(cookDuration);
      breakfastStore$.history[index].cookingDuration.set(prepDuration + cookDuration);
    }
  },

  getPendingRecipe: (): PendingRecipe | null => {
    return breakfastStore$.pendingRecipe.peek();
  },
};
