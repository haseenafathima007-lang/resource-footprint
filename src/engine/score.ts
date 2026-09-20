/**
 * Computes the sustainability score (0-100) based on actual daily consumption
 * compared against a reference household benchmark.
 *
 * Formula (Option 3 - Softer Bands / Smooth Logistic Decay):
 * ratio = actual / reference
 * resourceScore = clamp(100 / (1 + ratio^1.8), 0, 100)
 * overall = average of water and energy scores
 *
 * Key Anchors:
 * - ratio 0.0 -> 100
 * - ratio 0.5 -> 77.7
 * - ratio 1.0 -> 50.0
 * - ratio 1.5 -> 32.6
 * Zero or non-finite reference values are handled safely without crashing.
 */
export function calculateScore(
  actualDaily: { water: number; energy: number },
  referenceHousehold?: { water: number; energy: number }
): { overall: number; waterScore: number; energyScore: number } {
  const refWater = referenceHousehold?.water ?? 250;
  const refEnergy = referenceHousehold?.energy ?? 6;

  function scoreResource(actual: number, reference: number): number {
    if (!Number.isFinite(actual) || actual < 0) return 0;
    if (!Number.isFinite(reference) || reference <= 0) return 0; // safe handling of 0 reference without crashing

    const ratio = actual / reference;
    const rawScore = 100 / (1 + Math.pow(ratio, 1.8));
    const clamped = Math.max(0, Math.min(100, rawScore));
    return Number(clamped.toFixed(1));
  }

  const waterScore = scoreResource(actualDaily.water, refWater);
  const energyScore = scoreResource(actualDaily.energy, refEnergy);
  const overall = Number(((waterScore + energyScore) / 2).toFixed(1));

  return { overall, waterScore, energyScore };
}
