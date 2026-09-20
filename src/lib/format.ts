/**
 * Number and range formatting utilities for the Resource Footprint application.
 * Adheres to product principles: tangible units, outward-rounded ranges,
 * and clear 2-3 significant figure precision.
 */

/**
 * Rounds a number to a specified count of significant figures.
 */
export function roundToSigFigs(val: number, sigFigs: number = 2): number {
  if (!Number.isFinite(val) || val === 0) return 0;
  const abs = Math.abs(val);
  const d = Math.ceil(Math.log10(abs));
  const power = sigFigs - d;
  const magnitude = Math.pow(10, power);
  const rounded = Math.round(val * magnitude) / magnitude;
  return Number(rounded.toFixed(Math.max(0, power)));
}

/**
 * Rounds a number outward from typical/center:
 * - "floor": rounds down along the real number line (e.g. 27.4 -> 27, -15.3 -> -16)
 * - "ceil": rounds up along the real number line (e.g. 53.2 -> 54, -15.3 -> -15)
 * This guarantees low-high ranges never appear artificially tighter than they are.
 */
export function roundOutward(val: number, direction: "floor" | "ceil", sigFigs: number = 2): number {
  if (!Number.isFinite(val) || val === 0) return 0;
  const abs = Math.abs(val);
  const d = Math.ceil(Math.log10(abs));
  const power = sigFigs - d;
  const magnitude = Math.pow(10, power);
  if (direction === "floor") {
    const res = Math.floor(val * magnitude) / magnitude;
    return Number(res.toFixed(Math.max(0, power)));
  } else {
    const res = Math.ceil(val * magnitude) / magnitude;
    return Number(res.toFixed(Math.max(0, power)));
  }
}

/**
 * Formats a single number with commas and readable precision (2-3 sig figs).
 */
export function formatNumber(val: number): string {
  if (!Number.isFinite(val) || val === 0) return "0";
  const abs = Math.abs(val);
  
  if (abs >= 100) {
    const rounded = Math.round(val);
    return rounded.toLocaleString("en-US");
  }
  
  if (abs >= 10) {
    const rounded = Number(val.toFixed(1));
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  }
  
  if (abs >= 1) {
    return Number(val.toFixed(1)).toString();
  }

  // Very small numbers (< 1)
  return Number(val.toFixed(2)).toString();
}

/**
 * Formats an outward-rounded range: low floored, high ceiled.
 */
export function formatRange(low: number, high: number, unit?: string): string {
  const roundedLow = roundOutward(low, "floor", 2);
  const roundedHigh = roundOutward(high, "ceil", 2);
  const unitSuffix = unit ? ` ${unit}` : "";
  return `${formatNumber(roundedLow)}–${formatNumber(roundedHigh)}${unitSuffix}`;
}

/**
 * Formats a complete savings display string:
 * e.g. "typically ~270, range 210–340 L"
 */
export function formatSavingsDetails(
  typical: number,
  low: number,
  high: number,
  unit: string
): string {
  const roundedTyp = roundToSigFigs(typical, 2);
  const roundedLow = roundOutward(low, "floor", 2);
  const roundedHigh = roundOutward(high, "ceil", 2);
  return `typically ~${formatNumber(roundedTyp)}, range ${formatNumber(roundedLow)}–${formatNumber(roundedHigh)} ${unit}`;
}
