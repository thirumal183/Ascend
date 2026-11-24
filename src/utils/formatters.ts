/**
 * ASCEND Numerical & Formatting Utilities
 * Prevents IEEE-754 floating-point drift artifacts (e.g. 63.19999999999999g)
 * and guarantees clean, consistent, professional metric presentation.
 */

/**
 * Formats a numeric value to at most `maxDecimals` decimal places.
 * Trims redundant trailing zeros (e.g. "60.0" -> "60", "63.20" -> "63.2").
 */
export function formatNumber(
  val: number | string | null | undefined,
  maxDecimals = 1
): string {
  if (val == null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num)) return '0';

  // Round to desired precision
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;

  // Format and strip trailing zero decimals if integer
  const formatted = rounded.toFixed(maxDecimals);
  return formatted.replace(/\.0+$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
}

/**
 * Formats a calorie value as a rounded whole number.
 */
export function formatCalories(val: number | string | null | undefined): string {
  if (val == null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num)) return '0';
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Formats a macronutrient in grams with 1 decimal maximum (e.g. "63.2g" or "45g").
 */
export function formatGrams(val: number | string | null | undefined): string {
  return `${formatNumber(val, 1)}g`;
}

/**
 * Formats a micronutrient in milligrams as an integer (e.g. "250mg").
 */
export function formatMg(val: number | string | null | undefined): string {
  if (val == null || val === '') return '0mg';
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num)) return '0mg';
  return `${Math.round(num)}mg`;
}

/**
 * Formats percentage as an integer (e.g. 84%).
 */
export function formatPercent(val: number | string | null | undefined): string {
  if (val == null || val === '') return '0%';
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num)) return '0%';
  return `${Math.round(num)}%`;
}

/**
 * Formats body weight in kilograms with 1 decimal place (e.g. "74.5 kg").
 */
export function formatKg(val: number | string | null | undefined): string {
  return `${formatNumber(val, 1)} kg`;
}

/**
 * Formats liquid volume in milliliters or liters (e.g. "1,750 ml" or "2.5 L").
 */
export function formatMl(val: number | string | null | undefined): string {
  if (val == null || val === '') return '0 ml';
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num)) return '0 ml';
  return `${Math.round(num).toLocaleString('en-US')} ml`;
}
