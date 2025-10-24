import type { BreakfastType, BreakfastTypeDefinition } from '@/types/breakfast';

export const BREAKFAST_TYPES: Record<BreakfastType, BreakfastTypeDefinition> = {
  pancakes: {
    name: 'Pancakes',
    ratios: { flour: 2, liquid: 2, eggs: 1 },
    description: 'Fluffy and thick',
    serveWith: 'Serve with butter and maple syrup',
  },
  waffles: {
    name: 'Waffles',
    ratios: { flour: 2, liquid: 1.5, eggs: 2 },
    description: 'Crispy outside, light inside',
    serveWith: 'Serve with whipped cream and berries',
  },
  crepes: {
    name: 'Crepes',
    ratios: { flour: 1, liquid: 2, eggs: 2 },
    description: 'Thin and delicate',
    serveWith: 'Serve with Nutella and strawberries',
  },
  'dutch baby': {
    name: 'Dutch Baby',
    ratios: { flour: 1, liquid: 2, eggs: 3 },
    description: 'Puffy and eggy',
    serveWith: 'Dust with powdered sugar and lemon',
  },
  popover: {
    name: 'Popover',
    ratios: { flour: 1, liquid: 1, eggs: 2 },
    description: 'Hollow and airy',
    serveWith: 'Serve with butter and jam',
  },
  donut: {
    name: 'Donut',
    ratios: { flour: 3, liquid: 1, eggs: 1 },
    description: 'Dense and cakey',
    serveWith: 'Top with cinnamon sugar or glaze',
  },
  clafoutis: {
    name: 'Clafoutis',
    ratios: { flour: 1, liquid: 3, eggs: 4 },
    description: 'Custardy and soft',
    serveWith: 'Serve with fresh cherries or berries',
  },
};
