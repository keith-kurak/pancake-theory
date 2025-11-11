import type { Ratios } from '@/types/breakfast';
import {
  calculateDistance,
  findClosestBreakfast,
  getRankedBreakfasts,
  normalizeRatios,
} from '../ratio-matcher';

describe('normalizeRatios', () => {
  it('should normalize ratios to percentages that sum to 100', () => {
    const ratios: Ratios = { flour: 2, liquid: 2, eggs: 1 };
    const normalized = normalizeRatios(ratios);

    expect(normalized.flour).toBeCloseTo(40, 1);
    expect(normalized.liquid).toBeCloseTo(40, 1);
    expect(normalized.eggs).toBeCloseTo(20, 1);
    expect(normalized.flour + normalized.liquid + normalized.eggs).toBeCloseTo(
      100,
      1
    );
  });

  it('should handle equal ratios', () => {
    const ratios: Ratios = { flour: 1, liquid: 1, eggs: 1 };
    const normalized = normalizeRatios(ratios);

    expect(normalized.flour).toBeCloseTo(33.33, 1);
    expect(normalized.liquid).toBeCloseTo(33.33, 1);
    expect(normalized.eggs).toBeCloseTo(33.33, 1);
  });

  it('should handle zero total by returning equal percentages', () => {
    const ratios: Ratios = { flour: 0, liquid: 0, eggs: 0 };
    const normalized = normalizeRatios(ratios);

    expect(normalized.flour).toBeCloseTo(33.33, 1);
    expect(normalized.liquid).toBeCloseTo(33.33, 1);
    expect(normalized.eggs).toBeCloseTo(33.33, 1);
  });

  it('should handle large numbers', () => {
    const ratios: Ratios = { flour: 100, liquid: 50, eggs: 50 };
    const normalized = normalizeRatios(ratios);

    expect(normalized.flour).toBeCloseTo(50, 1);
    expect(normalized.liquid).toBeCloseTo(25, 1);
    expect(normalized.eggs).toBeCloseTo(25, 1);
  });

  it('should handle decimal ratios', () => {
    const ratios: Ratios = { flour: 1.5, liquid: 2.5, eggs: 1 };
    const normalized = normalizeRatios(ratios);

    expect(normalized.flour).toBeCloseTo(30, 1);
    expect(normalized.liquid).toBeCloseTo(50, 1);
    expect(normalized.eggs).toBeCloseTo(20, 1);
  });
});

describe('calculateDistance', () => {
  it('should return 0 for identical ratios', () => {
    const ratios1: Ratios = { flour: 50, liquid: 30, eggs: 20 };
    const ratios2: Ratios = { flour: 50, liquid: 30, eggs: 20 };
    const distance = calculateDistance(ratios1, ratios2);

    expect(distance).toBe(0);
  });

  it('should calculate Euclidean distance correctly', () => {
    const ratios1: Ratios = { flour: 0, liquid: 0, eggs: 0 };
    const ratios2: Ratios = { flour: 3, liquid: 4, eggs: 0 };
    const distance = calculateDistance(ratios1, ratios2);

    // 3-4-5 triangle
    expect(distance).toBe(5);
  });

  it('should calculate distance for different ratios', () => {
    const ratios1: Ratios = { flour: 40, liquid: 40, eggs: 20 };
    const ratios2: Ratios = { flour: 50, liquid: 30, eggs: 20 };
    const distance = calculateDistance(ratios1, ratios2);

    // sqrt((10)^2 + (-10)^2 + 0^2) = sqrt(200) ≈ 14.14
    expect(distance).toBeCloseTo(14.14, 1);
  });
});

describe('findClosestBreakfast', () => {
  it('should return "pancakes" for classic pancake ratios (2:2:1)', () => {
    const ratios: Ratios = { flour: 2, liquid: 2, eggs: 1 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('pancakes');
  });

  it('should return "waffles" for waffle ratios (2:1.5:2)', () => {
    const ratios: Ratios = { flour: 2, liquid: 1.5, eggs: 2 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('waffles');
  });

  it('should return "crepes" for crepe ratios (1:2:2)', () => {
    const ratios: Ratios = { flour: 1, liquid: 2, eggs: 2 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('crepes');
  });

  it('should return "dutch baby" for dutch baby ratios (1:2:3)', () => {
    const ratios: Ratios = { flour: 1, liquid: 2, eggs: 3 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('dutch-baby');
  });

  it('should return "popover" for popover ratios (1:1:2)', () => {
    const ratios: Ratios = { flour: 1, liquid: 1, eggs: 2 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('popover');
  });

  it('should return "donut" for donut ratios (3:1:1)', () => {
    const ratios: Ratios = { flour: 3, liquid: 1, eggs: 1 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('donut');
  });

  it('should return "clafoutis" for clafoutis ratios (1:3:4)', () => {
    const ratios: Ratios = { flour: 1, liquid: 3, eggs: 4 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('clafoutis');
  });

  it('should work with slider values (0-100 range)', () => {
    // High flour, low liquid and eggs should be donut
    const ratios: Ratios = { flour: 80, liquid: 10, eggs: 10 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('donut');
  });

  it('should work with equal slider values', () => {
    // Equal ratios should find the closest match
    const ratios: Ratios = { flour: 50, liquid: 50, eggs: 50 };
    const result = findClosestBreakfast(ratios);

    // Should be a valid breakfast type
    expect([
      'pancakes',
      'waffles',
      'crepes',
      'dutch baby',
      'popover',
      'donut',
      'clafoutis',
    ]).toContain(result);
  });

  it('should find closest match for intermediate ratios', () => {
    // Close to pancakes but not exact
    const ratios: Ratios = { flour: 2.1, liquid: 2.1, eggs: 1 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('pancakes');
  });

  it('should handle very high egg ratios (clafoutis territory)', () => {
    const ratios: Ratios = { flour: 10, liquid: 30, eggs: 40 };
    const result = findClosestBreakfast(ratios);

    expect(result).toBe('clafoutis');
  });

  it('should handle very high liquid ratios', () => {
    const ratios: Ratios = { flour: 10, liquid: 80, eggs: 10 };
    const result = findClosestBreakfast(ratios);

    // Very high liquid (80%) should match one of the liquid-heavy options
    // The algorithm normalizes to percentages: flour=10%, liquid=80%, eggs=10%
    // This is closest to crepes (20%, 40%, 40%) or similar liquid-heavy recipes
    expect(['crepes', 'clafoutis', 'dutch baby', 'pancakes']).toContain(result);
  });
});

describe('getRankedBreakfasts', () => {
  it('should return all breakfast types sorted by distance', () => {
    const ratios: Ratios = { flour: 2, liquid: 2, eggs: 1 };
    const ranked = getRankedBreakfasts(ratios);

    expect(ranked).toHaveLength(8);
    expect(ranked[0].type).toBe('pancakes'); // Closest match
    expect(ranked[0].distance).toBeLessThan(ranked[1].distance);
  });

  it('should have pancakes as closest for pancake ratios', () => {
    const ratios: Ratios = { flour: 2, liquid: 2, eggs: 1 };
    const ranked = getRankedBreakfasts(ratios);

    expect(ranked[0].type).toBe('pancakes');
    expect(ranked[0].distance).toBeCloseTo(0, 1);
  });

  it('should sort by ascending distance', () => {
    const ratios: Ratios = { flour: 50, liquid: 50, eggs: 50 };
    const ranked = getRankedBreakfasts(ratios);

    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].distance).toBeLessThanOrEqual(ranked[i + 1].distance);
    }
  });

  it('should include distance values', () => {
    const ratios: Ratios = { flour: 1, liquid: 1, eggs: 1 };
    const ranked = getRankedBreakfasts(ratios);

    ranked.forEach((item) => {
      expect(typeof item.distance).toBe('number');
      expect(item.distance).toBeGreaterThanOrEqual(0);
    });
  });
});
