import type {
  ActivityResult,
  BaselineProfile,
  Factor,
  FactorSetPayload,
  FactorsMap,
  Range,
} from './types.ts';
import { EngineError, assertValidProfile } from './validation.ts';
import { toFactorsMap } from './factors.ts';
import { calculate, ZERO_RANGE } from './calculate.ts';

/**
 * Calculates the personal daily footprint for a complete baseline profile.
 * Household size division rule:
 * - Shared household resources (AC, Fan, Laundry) are divided by householdSize.
 * - Personal habits (Shower, Laptop) are NOT divided by householdSize.
 */
export function calculateProfile(
  profile: BaselineProfile,
  factorsInput: FactorsMap | FactorSetPayload | Factor[]
): ActivityResult {
  assertValidProfile(profile);

  const factors = toFactorsMap(factorsInput);
  const H = profile.householdSize;

  // 1. Shower (Personal - not divided by householdSize)
  const showerRes = calculate(
    {
      type: 'SHOWER',
      minutesPerDay: profile.showerMinutesPerDay,
      heater: profile.showerHeater,
    },
    factors
  );

  // 2. Cooling & Appliances (AC and Fan divided by H; Laptop is personal)
  const acFactor = factors['ac.power'];
  const fanFactor = factors['fan.power'];
  const laptopFactor = factors['laptop.power'];

  if (!acFactor || !fanFactor || !laptopFactor) {
    throw new EngineError('Missing cooling/appliance power factors', 'MISSING_FACTOR');
  }

  // AC and Fan divided by household size H
  const perCapitaAcHours = profile.acHoursPerDay / H;
  const perCapitaFanHours = profile.fanHoursPerDay / H;
  const personalLaptopHours = profile.laptopHoursPerDay;

  const coolingEnergy: Range = {
    low: Number((perCapitaAcHours * acFactor.low + perCapitaFanHours * fanFactor.low + personalLaptopHours * laptopFactor.low).toFixed(3)),
    typical: Number((perCapitaAcHours * acFactor.typical + perCapitaFanHours * fanFactor.typical + personalLaptopHours * laptopFactor.typical).toFixed(3)),
    high: Number((perCapitaAcHours * acFactor.high + perCapitaFanHours * fanFactor.high + personalLaptopHours * laptopFactor.high).toFixed(3)),
  };

  // 3. Laundry (Shared - loadsPerWeek divided by householdSize H)
  const perCapitaLoadsPerWeek = profile.laundryLoadsPerWeek / H;
  const laundryRes = calculate(
    {
      type: 'LAUNDRY',
      loadsPerWeek: perCapitaLoadsPerWeek,
      machine: profile.laundryMachine,
    },
    factors
  );

  const totalWater: Range = {
    low: Number((showerRes.water.low + laundryRes.water.low).toFixed(2)),
    typical: Number((showerRes.water.typical + laundryRes.water.typical).toFixed(2)),
    high: Number((showerRes.water.high + laundryRes.water.high).toFixed(2)),
  };

  const totalEnergy: Range = {
    low: Number((showerRes.energy.low + coolingEnergy.low + laundryRes.energy.low).toFixed(3)),
    typical: Number((showerRes.energy.typical + coolingEnergy.typical + laundryRes.energy.typical).toFixed(3)),
    high: Number((showerRes.energy.high + coolingEnergy.high + laundryRes.energy.high).toFixed(3)),
  };

  return {
    water: totalWater,
    energy: totalEnergy,
    waste: { ...ZERO_RANGE },
  };
}

/**
 * Compares two profiles to determine savings (Before - After).
 * - Reduction in usage produces positive savings.
 * - Increase in usage produces negative savings.
 * - Identical profiles produce zero savings.
 * - Range ordering (low <= typical <= high) is strictly preserved.
 */
export function compareProfiles(
  before: BaselineProfile,
  after: BaselineProfile,
  factorsInput: FactorsMap | FactorSetPayload | Factor[]
): ActivityResult {
  const beforeRes = calculateProfile(before, factorsInput);
  const afterRes = calculateProfile(after, factorsInput);

  function diffRange(b: Range, a: Range, precision: number): Range {
    const dLow = Number((b.low - a.low).toFixed(precision));
    const dTyp = Number((b.typical - a.typical).toFixed(precision));
    const dHigh = Number((b.high - a.high).toFixed(precision));

    // Preserve ordering low <= typical <= high
    const low = Math.min(dLow, dHigh);
    const high = Math.max(dLow, dHigh);
    return { low, typical: dTyp, high };
  }

  return {
    water: diffRange(beforeRes.water, afterRes.water, 2),
    energy: diffRange(beforeRes.energy, afterRes.energy, 3),
    waste: { ...ZERO_RANGE },
  };
}
