import type { Ratios, BreakfastType } from '@/types/breakfast';
import { BREAKFAST_TYPES } from '@/constants/breakfast-ratios';

/**
 * Normalize ratios to percentages that sum to 100
 * This allows for fair comparison between different ratio inputs
 */
export function normalizeRatios(ratios: Ratios): Ratios {
  const total = ratios.flour + ratios.liquid + ratios.eggs;

  // Avoid division by zero
  if (total === 0) {
    return { flour: 33.33, liquid: 33.33, eggs: 33.33 };
  }

  return {
    flour: (ratios.flour / total) * 100,
    liquid: (ratios.liquid / total) * 100,
    eggs: (ratios.eggs / total) * 100,
  };
}

/**
 * Calculate Euclidean distance between two ratio sets
 * Lower distance means more similar ratios
 */
export function calculateDistance(ratios1: Ratios, ratios2: Ratios): number {
  const flourDiff = ratios1.flour - ratios2.flour;
  const liquidDiff = ratios1.liquid - ratios2.liquid;
  const eggsDiff = ratios1.eggs - ratios2.eggs;

  return Math.sqrt(flourDiff ** 2 + liquidDiff ** 2 + eggsDiff ** 2);
}

/**
 * Find the breakfast type that most closely matches the given ratios
 * Uses Euclidean distance on normalized ratios
 *
 * @param userRatios - The user's selected ratios (flour, liquid, eggs)
 * @returns The breakfast type key that best matches the ratios
 */
export function findClosestBreakfast(userRatios: Ratios): BreakfastType {
  // Normalize the user's ratios
  const normalizedUserRatios = normalizeRatios(userRatios);

  let closestType: BreakfastType = 'pancakes';
  let smallestDistance = Infinity;

  // Iterate through all breakfast types to find the closest match
  for (const [type, definition] of Object.entries(BREAKFAST_TYPES)) {
    const normalizedBreakfastRatios = normalizeRatios(definition.ratios);
    const distance = calculateDistance(
      normalizedUserRatios,
      normalizedBreakfastRatios
    );

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestType = type as BreakfastType;
    }
  }

  return closestType;
}

/**
 * Get all breakfast types sorted by how closely they match the given ratios
 * Returns an array of [type, distance] tuples sorted from closest to furthest
 */
export function getRankedBreakfasts(
  userRatios: Ratios
): Array<{ type: BreakfastType; distance: number }> {
  const normalizedUserRatios = normalizeRatios(userRatios);

  const ranked = Object.entries(BREAKFAST_TYPES).map(([type, definition]) => {
    const normalizedBreakfastRatios = normalizeRatios(definition.ratios);
    const distance = calculateDistance(
      normalizedUserRatios,
      normalizedBreakfastRatios
    );

    return {
      type: type as BreakfastType,
      distance,
    };
  });

  // Sort by distance (ascending - closest first)
  return ranked.sort((a, b) => a.distance - b.distance);
}
