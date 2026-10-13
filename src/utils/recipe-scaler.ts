import type { Ingredient } from "@/types/breakfast";

/**
 * Scale an ingredient amount by a given factor
 * Eggs are always rounded up to whole numbers
 */
export function scaleIngredient(
  amount: number,
  scaleFactor: number,
  category?: string
): number {
  const scaled = amount * scaleFactor;

  // Round up eggs to whole numbers
  if (category === 'eggs') {
    return Math.ceil(scaled);
  }

  return scaled;
}

/**
 * Format a scaled amount to a readable string with fractions
 */
export function formatAmount(amount: number): string {
  // Handle zero
  if (amount === 0) return '0';

  const wholePart = Math.floor(amount);
  const decimalPart = amount - wholePart;

  // Common fractions
  const fractions: Record<string, string> = {
    '0.125': '⅛',
    '0.25': '¼',
    '0.333': '⅓',
    '0.5': '½',
    '0.667': '⅔',
    '0.75': '¾',
  };

  // Find closest fraction
  let closestFraction = '';
  let closestDiff = Infinity;

  for (const [decimal, symbol] of Object.entries(fractions)) {
    const diff = Math.abs(parseFloat(decimal) - decimalPart);
    if (diff < closestDiff && diff < 0.05) {
      closestDiff = diff;
      closestFraction = symbol;
    }
  }

  // Build the result
  if (wholePart === 0 && closestFraction) {
    return closestFraction;
  } else if (closestFraction) {
    return `${wholePart} ${closestFraction}`;
  } else if (decimalPart === 0) {
    return wholePart.toString();
  } else {
    // Round to 2 decimal places if no fraction match
    return amount.toFixed(2).replace(/\.?0+$/, '');
  }
}

/**
 * Format a scaled metric amount: whole numbers for larger values, one decimal under 10
 */
export function formatMetricAmount(amount: number): string {
  if (amount === 0) return '0';
  if (amount >= 10) return Math.round(amount).toString();
  return amount.toFixed(1).replace(/\.0$/, '');
}

/**
 * Scaled amount and unit text for an ingredient in the chosen unit system.
 * Falls back to the imperial values when the recipe has no metric value.
 */
export function getIngredientDisplay(
  ingredient: Ingredient,
  scaleFactor: number,
  useMetric: boolean,
): { amount: string; unit: string } {
  if (useMetric && ingredient.metricAmount != null && ingredient.metricUnit) {
    return {
      amount: formatMetricAmount(
        scaleIngredient(ingredient.metricAmount, scaleFactor, ingredient.category),
      ),
      unit: ingredient.metricUnit,
    };
  }
  return {
    amount: formatAmount(
      scaleIngredient(ingredient.amount, scaleFactor, ingredient.category),
    ),
    unit: ingredient.unit,
  };
}
