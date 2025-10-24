import type { BreakfastType, BreakfastTypeDefinition } from '@/types/breakfast';

export const BREAKFAST_TYPES: Record<BreakfastType, BreakfastTypeDefinition> = {
  pancakes: {
    name: 'Pancakes',
    ratios: { flour: 2, liquid: 2, eggs: 1 },
  },
  waffles: {
    name: 'Waffles',
    ratios: { flour: 2, liquid: 1.5, eggs: 2 },
  },
  crepes: {
    name: 'Crepes',
    ratios: { flour: 1, liquid: 2, eggs: 2 },
  },
  'dutch baby': {
    name: 'Dutch Baby',
    ratios: { flour: 1, liquid: 2, eggs: 3 },
  },
  popover: {
    name: 'Popover',
    ratios: { flour: 1, liquid: 1, eggs: 2 },
  },
  donut: {
    name: 'Donut',
    ratios: { flour: 3, liquid: 1, eggs: 1 },
  },
  clafoutis: {
    name: 'Clafoutis',
    ratios: { flour: 1, liquid: 3, eggs: 4 },
  },
};
