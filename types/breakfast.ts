export type BreakfastType =
  | 'pancakes'
  | 'waffles'
  | 'crepes'
  | 'dutch baby'
  | 'popover'
  | 'donut'
  | 'clafoutis';

export interface Ratios {
  flour: number;
  liquid: number;
  eggs: number;
}

export interface BreakfastTypeDefinition {
  name: string;
  ratios: Ratios;
  description: string;
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

export interface HistoryEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeType: BreakfastType;
  timestamp: number;
  scaleFactor: number;
}

export interface BreakfastState {
  ratios: Ratios;
  breakfastTypes: Record<BreakfastType, BreakfastTypeDefinition>;
  recipes: Record<string, Recipe>;
  history: HistoryEntry[];
}
