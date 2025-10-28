import type { BreakfastType, BreakfastTypeDefinition } from '@/types/breakfast';

export const BREAKFAST_TYPES: Record<BreakfastType, BreakfastTypeDefinition> = {
  pancakes: {
    name: 'Pancakes',
    ratios: { flour: 2, liquid: 2, eggs: 1 },
    description: 'Fluffy and thick',
    serveWith: 'Serve with butter and maple syrup',
    tips: ['Cook with leftover bacon grease for extra crispy edges', 'Fold in fruit or chocolate chips for added flavor', 'Use an electric griddle for fast, consistent cooking']
  },
  waffles: {
    name: 'Waffles',
    ratios: { flour: 2, liquid: 1.5, eggs: 2 },
    description: 'Crispy outside, light inside',
    serveWith: 'Serve with whipped cream and berries',
    tips: ['Most recipes also work with chicken and waffles', 'Frozen fruit works just as well as a topping as fresh because of the juices']
  },
  crepes: {
    name: 'Crepes',
    ratios: { flour: 1, liquid: 2, eggs: 2 },
    description: 'Thin and delicate',
    serveWith: 'Serve with Nutella and strawberries',
    tips: ['Almost any topping works, sweet or savory', 'Overmixing doesn\'t matter as much, so you can make the batter fast in a blender' ]
  },
  'dutch-baby': {
    name: 'Dutch Baby',
    ratios: { flour: 1, liquid: 2, eggs: 3 },
    description: 'Puffy and eggy',
    serveWith: 'Dust with fresh strawberries and blueberries',
    tips: ['Avoid wet toppings that can make it soggy', 'Cast iron skillet is best, but almost anything round and oven-safe is a possibility']
  },
  popover: {
    name: 'Popover',
    ratios: { flour: 1, liquid: 1, eggs: 2 },
    description: 'Hollow and airy',
    serveWith: 'Serve with butter and jam',
    tips: ['You probably don\'t have a popover pan, but a muffin tin works well too', 'Make sure to preheat the pan so the batter starts cooking immediately']
  },
  donut: {
    name: 'Donut',
    ratios: { flour: 3, liquid: 1, eggs: 1 },
    description: 'Dense and cakey',
    serveWith: 'Top with cinnamon sugar or glaze',
    tips: ['Use a donut pan for best results', 'Fry in oil for a classic texture']
  },
  clafoutis: {
    name: 'Clafoutis',
    ratios: { flour: 1, liquid: 3, eggs: 4 },
    description: 'Custardy and soft',
    serveWith: 'Serve with fresh cherries or berries',
    tips: ['Cherries are common, but you can use almost any fruit, though juicy fruits are better']
  },
  'breakfast-cake': {
    name: 'Breakfast Cake',
    ratios: { flour: 3, liquid: 1, eggs: 2 },
    description: 'Thick but not too rich',
    serveWith: 'No toppings needed!',
    tips: ['Highly debatable as a pancake, here for comparison purposes because they\'re great for breakfast']
  }
};
