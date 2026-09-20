/**
 * Computes the sustainability score (0-100) based on actual daily consumption
 * compared against a reference household benchmark.
 *
 * Formula:
 * ratio = actual / reference
 * resourceScore = clamp(100 - (ratio - 0.5) * 100, 0, 100)
 * overall = average of water and energy scores
 *
 * Key Anchors:
 * - ratio 0.5 -> 100
 * - ratio 1.0 -> 50
 * - ratio 1.5+ -> 0
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
    const rawScore = 100 - (ratio - 0.5) * 100;
    const clamped = Math.max(0, Math.min(100, rawScore));
    return Number(clamped.toFixed(1));
  }

  const waterScore = scoreResource(actualDaily.water, refWater);
  const energyScore = scoreResource(actualDaily.energy, refEnergy);
  const overall = Number(((waterScore + energyScore) / 2).toFixed(1));

  return { overall, waterScore, energyScore };
}
