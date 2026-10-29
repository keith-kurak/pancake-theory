import type { Ingredient } from '@/types/breakfast';

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
 * Format a scaled metric amount (grams, millilitres)
 * Metric amounts read as decimals, not fractions
 */
export function formatMetricAmount(amount: number): string {
  if (amount === 0) return '0';
  if (amount >= 10) return Math.round(amount).toString();
  return amount.toFixed(1).replace(/\.0$/, '');
}

/**
 * Get the display amount and unit for an ingredient at a given scale
 * In metric mode, the recipe's own metric amount is used; there is no unit conversion.
 * Ingredients without a metric amount keep their standard amount.
 */
export function getDisplayAmount(
  ingredient: Ingredient,
  scaleFactor: number,
  useMetric: boolean
): { amount: string; unit: string } {
  const hasMetric =
    ingredient.metricAmount != null && ingredient.metricUnit != null;

  if (!useMetric || !hasMetric) {
    const scaled = scaleIngredient(
      ingredient.amount,
      scaleFactor,
      ingredient.category
    );
    return { amount: formatAmount(scaled), unit: ingredient.unit };
  }

  let scaledMetric = ingredient.metricAmount! * scaleFactor;

  // Eggs come whole: weigh the same rounded-up egg count that standard mode shows
  if (ingredient.category === 'eggs' && ingredient.amount) {
    const eggCount = scaleIngredient(ingredient.amount, scaleFactor, 'eggs');
    scaledMetric = (ingredient.metricAmount! / ingredient.amount) * eggCount;
  }

  return {
    amount: formatMetricAmount(scaledMetric),
    unit: ingredient.metricUnit!,
  };
}
