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
 * Format a metric amount: whole numbers from 10 up, one decimal below that
 */
export function formatMetricAmount(amount: number): string {
  if (amount >= 10) return Math.round(amount).toString();
  return amount.toFixed(1).replace(/\.0$/, '');
}
