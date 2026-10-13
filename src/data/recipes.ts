import type { Recipe } from "@/types/breakfast";

// Import recipes from JSON files
import breakfastCakeAppleKuchen from "./more-recipes/breakfast-cake-apple-kuchen.json";
import breakfastCakeCoffeeCake from "./more-recipes/breakfast-cake-coffee-cake.json";
import clafloutisVersatile from "./more-recipes/clafoutis-versatile.json";
import crepesBasic from "./more-recipes/crepes-basic.json";
import crepesFrench from "./more-recipes/crepes-french.json";
import donutsBaked from "./more-recipes/donuts-baked.json";
import donutsFried from "./more-recipes/donuts-fried.json";
import donutsMiniFried from "./more-recipes/donuts-mini-fried.json";
import dutchBabyBlueberry from "./more-recipes/dutch-baby-blueberry.json";
import dutchBabyClassic from "./more-recipes/dutch-baby-classic.json";
import pancakesButtermilk from "./more-recipes/pancakes-buttermilk.json";
import pancakesOneBowl from "./more-recipes/pancakes-one-bowl.json";
import pancakesScrambled from "./more-recipes/pancakes-scrambled.json";
import popoverQuick from "./more-recipes/popover-quick.json";
import wafflesFluffy from "./more-recipes/waffles-fluffy.json";
import wafflesQuick from "./more-recipes/waffles-quick.json";

export const RECIPES: Recipe[] = [
  // Pancakes - imported from JSON
  pancakesOneBowl as Recipe,
  pancakesButtermilk as Recipe,
  pancakesScrambled as Recipe,

  // Waffles - imported from JSON
  wafflesFluffy as Recipe,
  wafflesQuick as Recipe,

  // Crepes - imported from JSON
  crepesBasic as Recipe,
  crepesFrench as Recipe,

  // Dutch Baby - imported from JSON
  dutchBabyClassic as Recipe,
  dutchBabyBlueberry as Recipe,

  // Donuts - imported from JSON
  donutsBaked as Recipe,
  donutsFried as Recipe,
  donutsMiniFried as Recipe,

  // Popover - inline recipe
  {
    id: "popover-traditional",
    type: "popover",
    name: "Traditional Popovers",
    ingredients: [
      { name: "All-purpose flour", amount: 1, unit: "cup", metricAmount: 125, metricUnit: "g", category: "flour" },
      { name: "Milk", amount: 1, unit: "cup", metricAmount: 240, metricUnit: "ml", category: "liquid" },
      { name: "Eggs", amount: 2, unit: "large", metricAmount: 100, metricUnit: "g", category: "eggs" },
      { name: "Salt", amount: 0.5, unit: "tsp", metricAmount: 3, metricUnit: "g", category: "other" },
      { name: "Melted butter", amount: 1, unit: "tbsp", metricAmount: 14, metricUnit: "g", category: "other" },
    ],
    directions: [
      "Preheat oven to 450°F (230°C).",
      "Generously grease a popover pan or muffin tin.",
      "In a bowl, whisk together eggs and milk.",
      "Add flour and salt, whisking until smooth.",
      "Stir in melted butter.",
      "Fill cups about 2/3 full.",
      "Bake at 450°F for 15 minutes.",
      "Reduce heat to 350°F and bake for another 15-20 minutes until golden.",
      "Do not open oven door during baking or they may deflate.",
      "Remove from oven, pierce each popover with a knife to release steam, and serve immediately.",
    ],
  },
  popoverQuick as Recipe,
  // Clafoutis - inline recipe
  {
    id: "clafoutis-cherry",
    type: "clafoutis",
    name: "Cherry Clafoutis",
    ingredients: [
      {
        name: "All-purpose flour",
        amount: 0.5,
        unit: "cup",
        metricAmount: 62,
        metricUnit: "g",
        category: "flour",
      },
      { name: "Milk", amount: 1.5, unit: "cups", metricAmount: 360, metricUnit: "ml", category: "liquid" },
      { name: "Eggs", amount: 4, unit: "large", metricAmount: 200, metricUnit: "g", category: "eggs" },
      { name: "Sugar", amount: 0.5, unit: "cup", metricAmount: 100, metricUnit: "g", category: "other" },
      { name: "Vanilla extract", amount: 1, unit: "tsp", metricAmount: 5, metricUnit: "ml", category: "other" },
      { name: "Salt", amount: 0.25, unit: "tsp", metricAmount: 1.5, metricUnit: "g", category: "other" },
      { name: "Butter for pan", amount: 1, unit: "tbsp", metricAmount: 14, metricUnit: "g", category: "other" },
      {
        name: "Fresh cherries, pitted",
        amount: 2,
        unit: "cups",
        metricAmount: 310,
        metricUnit: "g",
        category: "other",
      },
      {
        name: "Powdered sugar for dusting",
        amount: 2,
        unit: "tbsp",
        metricAmount: 15,
        metricUnit: "g",
        category: "other",
      },
    ],
    directions: [
      "Preheat oven to 375°F (190°C).",
      "Butter a 10-inch pie dish or baking dish.",
      "Arrange cherries in the bottom of the dish.",
      "In a blender, combine eggs, milk, flour, sugar, vanilla, and salt. Blend until very smooth.",
      "Pour batter over cherries.",
      "Bake for 35-40 minutes until puffed and golden.",
      "The center should be just set.",
      "Let cool for 10 minutes.",
      "Dust with powdered sugar before serving.",
      "Serve warm or at room temperature.",
    ],
  },
  clafloutisVersatile as Recipe,
  // Breakfast Cakes - imported from JSON
  breakfastCakeCoffeeCake as Recipe,
  breakfastCakeAppleKuchen as Recipe,
];

// Helper function to get recipes by type
export function getRecipesByType(type: string): Recipe[] {
  return RECIPES.filter((recipe) => recipe.type === type);
}

// Helper function to get recipe by ID
export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}
