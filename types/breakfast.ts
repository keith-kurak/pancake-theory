export type BreakfastType =
  | 'pancakes'
  | 'waffles'
  | 'crepes'
  | 'dutch-baby'
  | 'popover'
  | 'donut'
  | 'clafoutis'
  | 'breakfast-cake';

export interface Ratios {
  flour: number;
  liquid: number;
  eggs: number;
}

export interface BreakfastTypeDefinition {
  name: string;
  ratios: Ratios;
  description: string;
  serveWith: string;
  tips?: string[];
  primaryImage: number;
  userImages?: number[];
}

export type IngredientCategory = 'flour' | 'liquid' | 'eggs' | 'other';

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category: IngredientCategory;
}

export interface Recipe {
  id: string;
  type: BreakfastType;
  name: string;
  ingredients: Ingredient[];
  directions: string[];
}

export interface PendingRecipe {
  recipeId: string;
  recipeName: string;
  recipeType: BreakfastType;
  scaleFactor: number;
  checkedIngredients: number[];
  startTime: number;
  prepEndTime?: number; // When user switched from prep to cook
}

export interface HistoryEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeType: BreakfastType;
  timestamp: number;
  scaleFactor: number;
  cookingDuration?: number; // Total duration (for backwards compat)
  prepDuration?: number; // Time spent in prep phase
  cookDuration?: number; // Time spent in cook phase
}

export interface BreakfastState {
  ratios: Ratios;
  breakfastTypes: Record<BreakfastType, BreakfastTypeDefinition>;
  recipes: Record<string, Recipe>;
  history: HistoryEntry[];
}

export interface RecipeNote {
  id: string;
  timestamp: number;
  content: string;
}

// expand this later as there's more per-recipe user data
export interface UserRecipeData {
  recipeId: string;
  notes: RecipeNote[];
}