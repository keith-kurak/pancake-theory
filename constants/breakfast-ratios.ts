import type { BreakfastType, BreakfastTypeDefinition } from '@/types/breakfast';

export const BREAKFAST_TYPES: Record<BreakfastType, BreakfastTypeDefinition> = {
  pancakes: {
    name: 'Pancakes',
    ratios: { flour: 2, liquid: 2, eggs: 1 },
    description: 'Fluffy and thick',
  },
  waffles: {
    name: 'Waffles',
    ratios: { flour: 2, liquid: 1.5, eggs: 2 },
    description: 'Crispy outside, light inside',
  },
  crepes: {
    name: 'Crepes',
    ratios: { flour: 1, liquid: 2, eggs: 2 },
    description: 'Thin and delicate',
  },
  'dutch baby': {
    name: 'Dutch Baby',
    ratios: { flour: 1, liquid: 2, eggs: 3 },
    description: 'Puffy and eggy',
  },
  popover: {
    name: 'Popover',
    ratios: { flour: 1, liquid: 1, eggs: 2 },
    description: 'Hollow and airy',
  },
  donut: {
    name: 'Donut',
    ratios: { flour: 3, liquid: 1, eggs: 1 },
    description: 'Dense and cakey',
  },
  clafoutis: {
    name: 'Clafoutis',
    ratios: { flour: 1, liquid: 3, eggs: 4 },
    description: 'Custardy and soft',
  },
};
