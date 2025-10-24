import type { Recipe } from '@/types/breakfast';

export const RECIPES: Recipe[] = [
  // Pancakes
  {
    id: 'pancakes-classic',
    type: 'pancakes',
    name: 'Classic Buttermilk Pancakes',
    ingredients: [
      { name: 'All-purpose flour', amount: 2, unit: 'cups', category: 'flour' },
      { name: 'Buttermilk', amount: 2, unit: 'cups', category: 'liquid' },
      { name: 'Eggs', amount: 2, unit: 'large', category: 'eggs' },
      { name: 'Sugar', amount: 2, unit: 'tbsp', category: 'other' },
      { name: 'Baking powder', amount: 2, unit: 'tsp', category: 'other' },
      { name: 'Baking soda', amount: 1, unit: 'tsp', category: 'other' },
      { name: 'Salt', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Melted butter', amount: 4, unit: 'tbsp', category: 'other' },
    ],
    directions: [
      'In a large bowl, whisk together flour, sugar, baking powder, baking soda, and salt.',
      'In another bowl, whisk together buttermilk, eggs, and melted butter.',
      'Pour wet ingredients into dry ingredients and stir until just combined. Do not overmix; batter should be slightly lumpy.',
      'Heat a griddle or large skillet over medium heat and lightly grease.',
      'Pour 1/4 cup of batter onto the griddle for each pancake.',
      'Cook until bubbles form on the surface and edges look set, about 2-3 minutes.',
      'Flip and cook until golden brown on the other side, about 1-2 minutes.',
      'Serve warm with butter and syrup.',
    ],
  },
  {
    id: 'pancakes-blueberry',
    type: 'pancakes',
    name: 'Blueberry Pancakes',
    ingredients: [
      { name: 'All-purpose flour', amount: 2, unit: 'cups', category: 'flour' },
      { name: 'Milk', amount: 2, unit: 'cups', category: 'liquid' },
      { name: 'Eggs', amount: 2, unit: 'large', category: 'eggs' },
      { name: 'Sugar', amount: 3, unit: 'tbsp', category: 'other' },
      { name: 'Baking powder', amount: 2, unit: 'tsp', category: 'other' },
      { name: 'Salt', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Vanilla extract', amount: 1, unit: 'tsp', category: 'other' },
      { name: 'Melted butter', amount: 4, unit: 'tbsp', category: 'other' },
      { name: 'Fresh blueberries', amount: 1, unit: 'cup', category: 'other' },
    ],
    directions: [
      'Whisk together flour, sugar, baking powder, and salt in a large bowl.',
      'In another bowl, whisk together milk, eggs, melted butter, and vanilla.',
      'Add wet ingredients to dry and stir until just combined.',
      'Gently fold in blueberries.',
      'Heat and grease a griddle over medium heat.',
      'Pour 1/4 cup batter for each pancake.',
      'Cook until bubbles form, about 2-3 minutes, then flip.',
      'Cook until golden, another 1-2 minutes.',
    ],
  },

  // Waffles
  {
    id: 'waffles-belgian',
    type: 'waffles',
    name: 'Belgian Waffles',
    ingredients: [
      { name: 'All-purpose flour', amount: 2, unit: 'cups', category: 'flour' },
      { name: 'Milk', amount: 1.75, unit: 'cups', category: 'liquid' },
      { name: 'Eggs', amount: 2, unit: 'large', category: 'eggs' },
      { name: 'Sugar', amount: 0.25, unit: 'cup', category: 'other' },
      { name: 'Baking powder', amount: 4, unit: 'tsp', category: 'other' },
      { name: 'Salt', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Vanilla extract', amount: 1, unit: 'tsp', category: 'other' },
      { name: 'Melted butter', amount: 0.5, unit: 'cup', category: 'other' },
    ],
    directions: [
      'Preheat your waffle iron.',
      'In a large bowl, mix flour, sugar, baking powder, and salt.',
      'In another bowl, beat eggs, then add milk, melted butter, and vanilla.',
      'Pour wet ingredients into dry and stir until just combined.',
      'Spray waffle iron with non-stick spray.',
      'Pour batter onto waffle iron (amount depends on size of iron).',
      'Close lid and cook until golden brown and crispy, about 4-5 minutes.',
      'Serve immediately with your favorite toppings.',
    ],
  },

  // Crepes
  {
    id: 'crepes-french',
    type: 'crepes',
    name: 'French Crepes',
    ingredients: [
      { name: 'All-purpose flour', amount: 1, unit: 'cup', category: 'flour' },
      { name: 'Milk', amount: 2, unit: 'cups', category: 'liquid' },
      { name: 'Eggs', amount: 4, unit: 'large', category: 'eggs' },
      { name: 'Sugar', amount: 2, unit: 'tbsp', category: 'other' },
      { name: 'Salt', amount: 0.25, unit: 'tsp', category: 'other' },
      { name: 'Melted butter', amount: 3, unit: 'tbsp', category: 'other' },
      { name: 'Vanilla extract', amount: 1, unit: 'tsp', category: 'other' },
    ],
    directions: [
      'In a blender, combine all ingredients and blend until smooth.',
      'Let batter rest for at least 30 minutes at room temperature.',
      'Heat a non-stick crepe pan or skillet over medium heat.',
      'Lightly butter the pan.',
      'Pour about 1/4 cup of batter and immediately swirl pan to coat bottom evenly.',
      'Cook until edges begin to brown, about 1 minute.',
      'Flip and cook other side for about 30 seconds.',
      'Transfer to a plate and repeat with remaining batter.',
    ],
  },

  // Dutch Baby
  {
    id: 'dutch-baby-classic',
    type: 'dutch baby',
    name: 'Classic Dutch Baby',
    ingredients: [
      { name: 'All-purpose flour', amount: 0.5, unit: 'cup', category: 'flour' },
      { name: 'Milk', amount: 0.5, unit: 'cup', category: 'liquid' },
      { name: 'Eggs', amount: 3, unit: 'large', category: 'eggs' },
      { name: 'Sugar', amount: 1, unit: 'tbsp', category: 'other' },
      { name: 'Vanilla extract', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Salt', amount: 0.25, unit: 'tsp', category: 'other' },
      { name: 'Butter', amount: 3, unit: 'tbsp', category: 'other' },
      { name: 'Powdered sugar', amount: 2, unit: 'tbsp', category: 'other' },
      { name: 'Lemon wedges', amount: 1, unit: 'each', category: 'other' },
    ],
    directions: [
      'Preheat oven to 425°F (220°C).',
      'Place butter in a 10-inch cast iron skillet and put in oven to melt.',
      'In a blender, combine eggs, milk, flour, sugar, vanilla, and salt. Blend until smooth.',
      'Remove skillet from oven (butter should be melted and sizzling).',
      'Pour batter into the hot skillet.',
      'Return to oven and bake for 20-25 minutes until puffed and golden.',
      'Remove from oven (it will deflate quickly).',
      'Dust with powdered sugar and serve with lemon wedges.',
    ],
  },

  // Popover
  {
    id: 'popover-traditional',
    type: 'popover',
    name: 'Traditional Popovers',
    ingredients: [
      { name: 'All-purpose flour', amount: 1, unit: 'cup', category: 'flour' },
      { name: 'Milk', amount: 1, unit: 'cup', category: 'liquid' },
      { name: 'Eggs', amount: 2, unit: 'large', category: 'eggs' },
      { name: 'Salt', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Melted butter', amount: 1, unit: 'tbsp', category: 'other' },
    ],
    directions: [
      'Preheat oven to 450°F (230°C).',
      'Generously grease a popover pan or muffin tin.',
      'In a bowl, whisk together eggs and milk.',
      'Add flour and salt, whisking until smooth.',
      'Stir in melted butter.',
      'Fill cups about 2/3 full.',
      'Bake at 450°F for 15 minutes.',
      'Reduce heat to 350°F and bake for another 15-20 minutes until golden.',
      'Do not open oven door during baking or they may deflate.',
      'Remove from oven, pierce each popover with a knife to release steam, and serve immediately.',
    ],
  },

  // Donut
  {
    id: 'donut-cake',
    type: 'donut',
    name: 'Cake Donuts',
    ingredients: [
      { name: 'All-purpose flour', amount: 3, unit: 'cups', category: 'flour' },
      { name: 'Milk', amount: 1, unit: 'cup', category: 'liquid' },
      { name: 'Eggs', amount: 2, unit: 'large', category: 'eggs' },
      { name: 'Sugar', amount: 0.75, unit: 'cup', category: 'other' },
      { name: 'Baking powder', amount: 2, unit: 'tsp', category: 'other' },
      { name: 'Baking soda', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Salt', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Nutmeg', amount: 0.5, unit: 'tsp', category: 'other' },
      { name: 'Melted butter', amount: 4, unit: 'tbsp', category: 'other' },
      { name: 'Vanilla extract', amount: 1, unit: 'tsp', category: 'other' },
      { name: 'Vegetable oil for frying', amount: 4, unit: 'cups', category: 'other' },
    ],
    directions: [
      'In a large bowl, whisk together flour, sugar, baking powder, baking soda, salt, and nutmeg.',
      'In another bowl, whisk together eggs, milk, melted butter, and vanilla.',
      'Add wet ingredients to dry and mix until just combined.',
      'Turn dough out onto a floured surface and knead gently.',
      'Roll dough to about 1/2-inch thickness.',
      'Cut out donuts using a donut cutter or two round cutters.',
      'Heat oil to 375°F (190°C) in a deep pot.',
      'Fry donuts for about 1 minute per side until golden brown.',
      'Drain on paper towels.',
      'While warm, toss in cinnamon sugar or glaze as desired.',
    ],
  },

  // Clafoutis
  {
    id: 'clafoutis-cherry',
    type: 'clafoutis',
    name: 'Cherry Clafoutis',
    ingredients: [
      { name: 'All-purpose flour', amount: 0.5, unit: 'cup', category: 'flour' },
      { name: 'Milk', amount: 1.5, unit: 'cups', category: 'liquid' },
      { name: 'Eggs', amount: 4, unit: 'large', category: 'eggs' },
      { name: 'Sugar', amount: 0.5, unit: 'cup', category: 'other' },
      { name: 'Vanilla extract', amount: 1, unit: 'tsp', category: 'other' },
      { name: 'Salt', amount: 0.25, unit: 'tsp', category: 'other' },
      { name: 'Butter for pan', amount: 1, unit: 'tbsp', category: 'other' },
      { name: 'Fresh cherries, pitted', amount: 2, unit: 'cups', category: 'other' },
      { name: 'Powdered sugar for dusting', amount: 2, unit: 'tbsp', category: 'other' },
    ],
    directions: [
      'Preheat oven to 375°F (190°C).',
      'Butter a 10-inch pie dish or baking dish.',
      'Arrange cherries in the bottom of the dish.',
      'In a blender, combine eggs, milk, flour, sugar, vanilla, and salt. Blend until very smooth.',
      'Pour batter over cherries.',
      'Bake for 35-40 minutes until puffed and golden.',
      'The center should be just set.',
      'Let cool for 10 minutes.',
      'Dust with powdered sugar before serving.',
      'Serve warm or at room temperature.',
    ],
  },
];

// Helper function to get recipes by type
export function getRecipesByType(type: string): Recipe[] {
  return RECIPES.filter((recipe) => recipe.type === type);
}

// Helper function to get recipe by ID
export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}
