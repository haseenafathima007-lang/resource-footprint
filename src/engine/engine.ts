import type {
  ActivityInput,
  ActivityResult,
  Factor,
  FactorSetPayload,
  FactorsMap,
  Range,
} from '../types/index.ts';
import type { BaselineProfile } from '../types/profile.ts';

export class EngineError extends Error {
  constructor(message: string, public readonly code: string = 'INVALID_INPUT') {
    super(message);
    this.name = 'EngineError';
  }
}

export const PROFILE_BOUNDS = {
  householdSize: { min: 1, max: 20 },
  showerMinutesPerDay: { min: 0, max: 120 },
  acHoursPerDay: { min: 0, max: 24 },
  fanHoursPerDay: { min: 0, max: 24 },
  laptopHoursPerDay: { min: 0, max: 24 },
  laundryLoadsPerWeek: { min: 0, max: 50 },
} as const;

export type Period = 'day' | 'week' | 'month' | 'year';

export const PERIOD_MULTIPLIERS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
} as const;

/**
 * Validates a factor set payload or array.
 * Rejects missing ids, duplicates, low > typical or typical > high, negative and non-finite values.
 */
export function validateFactorSet(payload: unknown): FactorsMap {
  if (!payload || typeof payload !== 'object') {
    throw new EngineError('Factor set payload must be a non-null object', 'INVALID_FACTOR_SET');
  }

  let factorsList: Factor[];
  if ('factors' in payload && Array.isArray((payload as FactorSetPayload).factors)) {
    factorsList = (payload as FactorSetPayload).factors;
  } else if (Array.isArray(payload)) {
    factorsList = payload as Factor[];
  } else {
    throw new EngineError('Factor set missing valid factors array', 'INVALID_FACTOR_SET');
  }

  const map: FactorsMap = {};
  const seenIds = new Set<string>();

  for (let i = 0; i < factorsList.length; i++) {
    const f = factorsList[i];
    if (!f || typeof f !== 'object') {
      throw new EngineError(`Factor at index ${i} is not an object`, 'INVALID_FACTOR');
    }
    if (!f.id || typeof f.id !== 'string' || f.id.trim() === '') {
      throw new EngineError(`Factor at index ${i} has missing or empty id`, 'MISSING_FACTOR_ID');
    }
    if (seenIds.has(f.id)) {
      throw new EngineError(`Duplicate factor id detected: '${f.id}'`, 'DUPLICATE_FACTOR_ID');
    }
    seenIds.add(f.id);

    if (typeof f.low !== 'number' || !Number.isFinite(f.low)) {
      throw new EngineError(`Factor '${f.id}' has non-finite low value`, 'INVALID_FACTOR_VALUE');
    }
    if (typeof f.typical !== 'number' || !Number.isFinite(f.typical)) {
      throw new EngineError(`Factor '${f.id}' has non-finite typical value`, 'INVALID_FACTOR_VALUE');
    }
    if (typeof f.high !== 'number' || !Number.isFinite(f.high)) {
      throw new EngineError(`Factor '${f.id}' has non-finite high value`, 'INVALID_FACTOR_VALUE');
    }

    if (f.low < 0 || f.typical < 0 || f.high < 0) {
      throw new EngineError(`Factor '${f.id}' contains negative values`, 'NEGATIVE_FACTOR_VALUE');
    }

    if (f.low > f.typical || f.typical > f.high) {
      throw new EngineError(
        `Factor '${f.id}' violates range ordering: low (${f.low}) <= typical (${f.typical}) <= high (${f.high})`,
        'RANGE_ORDER_VIOLATION'
      );
    }

    map[f.id] = f;
  }

  return map;
}

export function toFactorsMap(
  factors: FactorsMap | FactorSetPayload | Factor[]
): FactorsMap {
  if (Array.isArray(factors) || ('factors' in factors && Array.isArray((factors as FactorSetPayload).factors))) {
    return validateFactorSet(factors);
  }
  return factors as FactorsMap;
}

/**
 * Validates baseline profile fields against PROFILE_BOUNDS and domain constraints.
 * Checks for NaN, Infinity, negative values, and bound violations.
 * Returns an error record or null if valid.
 */
export function validateProfile(
  data: Record<string, unknown>
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (data.householdSize !== undefined) {
    const val = Number(data.householdSize);
    if (!Number.isFinite(val) || !Number.isInteger(val) || val < PROFILE_BOUNDS.householdSize.min || val > PROFILE_BOUNDS.householdSize.max) {
      errors.householdSize = `Household size must be an integer between ${PROFILE_BOUNDS.householdSize.min} and ${PROFILE_BOUNDS.householdSize.max}`;
    }
  }

  if (data.showerMinutesPerDay !== undefined) {
    const val = Number(data.showerMinutesPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.showerMinutesPerDay.min || val > PROFILE_BOUNDS.showerMinutesPerDay.max) {
      errors.showerMinutesPerDay = `Shower minutes per day must be between ${PROFILE_BOUNDS.showerMinutesPerDay.min} and ${PROFILE_BOUNDS.showerMinutesPerDay.max}`;
    }
  }

  if (data.acHoursPerDay !== undefined) {
    const val = Number(data.acHoursPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.acHoursPerDay.min || val > PROFILE_BOUNDS.acHoursPerDay.max) {
      errors.acHoursPerDay = `AC hours per day must be between ${PROFILE_BOUNDS.acHoursPerDay.min} and ${PROFILE_BOUNDS.acHoursPerDay.max}`;
    }
  }

  if (data.fanHoursPerDay !== undefined) {
    const val = Number(data.fanHoursPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.fanHoursPerDay.min || val > PROFILE_BOUNDS.fanHoursPerDay.max) {
      errors.fanHoursPerDay = `Fan hours per day must be between ${PROFILE_BOUNDS.fanHoursPerDay.min} and ${PROFILE_BOUNDS.fanHoursPerDay.max}`;
    }
  }

  if (data.laptopHoursPerDay !== undefined) {
    const val = Number(data.laptopHoursPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.laptopHoursPerDay.min || val > PROFILE_BOUNDS.laptopHoursPerDay.max) {
      errors.laptopHoursPerDay = `Laptop hours per day must be between ${PROFILE_BOUNDS.laptopHoursPerDay.min} and ${PROFILE_BOUNDS.laptopHoursPerDay.max}`;
    }
  }

  if (data.laundryLoadsPerWeek !== undefined) {
    const val = Number(data.laundryLoadsPerWeek);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.laundryLoadsPerWeek.min || val > PROFILE_BOUNDS.laundryLoadsPerWeek.max) {
      errors.laundryLoadsPerWeek = `Laundry loads per week must be between ${PROFILE_BOUNDS.laundryLoadsPerWeek.min} and ${PROFILE_BOUNDS.laundryLoadsPerWeek.max}`;
    }
  }

  if (data.showerHeater !== undefined && data.showerHeater !== 'none' && data.showerHeater !== 'electric') {
    errors.showerHeater = `Shower heater must be either 'none' or 'electric'`;
  }

  if (data.laundryMachine !== undefined && data.laundryMachine !== 'topLoad' && data.laundryMachine !== 'frontLoad') {
    errors.laundryMachine = `Laundry machine must be either 'topLoad' or 'frontLoad'`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export function assertValidProfile(profile: Partial<BaselineProfile>): void {
  const errors = validateProfile(profile as Record<string, unknown>);
  if (errors) {
    const firstKey = Object.keys(errors)[0];
    throw new EngineError(errors[firstKey], 'INVALID_PROFILE');
  }
}

const ZERO_RANGE: Range = { low: 0, typical: 0, high: 0 };

/**
 * Calculates water, energy, and waste for a single activity.
 * Pure and unit-testable. Throws EngineError on invalid inputs or missing factors.
 */
export function calculate(
  activity: ActivityInput,
  factorsInput: FactorsMap | FactorSetPayload | Factor[]
): ActivityResult {
  if (!activity || typeof activity !== 'object') {
    throw new EngineError('Activity input must be a non-null object', 'INVALID_ACTIVITY');
  }

  const factors = toFactorsMap(factorsInput);

  const water: Range = { low: 0, typical: 0, high: 0 };
  const energy: Range = { low: 0, typical: 0, high: 0 };
  const waste: Range = { ...ZERO_RANGE }; // 0 in MVP, kept in data model

  switch (activity.type) {
    case 'SHOWER': {
      const minutes = activity.minutesPerDay;
      if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
        throw new EngineError('Shower minutes must be a non-negative finite number', 'INVALID_INPUT');
      }
      if (activity.heater !== 'none' && activity.heater !== 'electric') {
        throw new EngineError(`Invalid shower heater type: '${activity.heater}'`, 'INVALID_INPUT');
      }

      if (minutes === 0) {
        return { water: { ...ZERO_RANGE }, energy: { ...ZERO_RANGE }, waste };
      }

      const flow = factors['shower.flow'];
      if (!flow) {
        throw new EngineError("Missing conversion factor: 'shower.flow'", 'MISSING_FACTOR');
      }

      water.low = Number((minutes * flow.low).toFixed(2));
      water.typical = Number((minutes * flow.typical).toFixed(2));
      water.high = Number((minutes * flow.high).toFixed(2));

      if (activity.heater === 'electric') {
        const heating = factors['shower.heating'];
        if (!heating) {
          throw new EngineError("Missing conversion factor: 'shower.heating'", 'MISSING_FACTOR');
        }
        energy.low = Number((water.low * heating.low).toFixed(3));
        energy.typical = Number((water.typical * heating.typical).toFixed(3));
        energy.high = Number((water.high * heating.high).toFixed(3));
      }
      break;
    }

    case 'COOLING_APPLIANCES': {
      const { acHoursPerDay, fanHoursPerDay, laptopHoursPerDay } = activity;

      if (typeof acHoursPerDay !== 'number' || !Number.isFinite(acHoursPerDay) || acHoursPerDay < 0) {
        throw new EngineError('AC hours per day must be a non-negative finite number', 'INVALID_INPUT');
      }
      if (typeof fanHoursPerDay !== 'number' || !Number.isFinite(fanHoursPerDay) || fanHoursPerDay < 0) {
        throw new EngineError('Fan hours per day must be a non-negative finite number', 'INVALID_INPUT');
      }
      if (typeof laptopHoursPerDay !== 'number' || !Number.isFinite(laptopHoursPerDay) || laptopHoursPerDay < 0) {
        throw new EngineError('Laptop hours per day must be a non-negative finite number', 'INVALID_INPUT');
      }

      const acFactor = factors['ac.power'];
      const fanFactor = factors['fan.power'];
      const laptopFactor = factors['laptop.power'];

      if (!acFactor || !fanFactor || !laptopFactor) {
        throw new EngineError('Missing cooling/appliance power conversion factors', 'MISSING_FACTOR');
      }

      const acLow = acHoursPerDay * acFactor.low;
      const acTyp = acHoursPerDay * acFactor.typical;
      const acHigh = acHoursPerDay * acFactor.high;

      const fanLow = fanHoursPerDay * fanFactor.low;
      const fanTyp = fanHoursPerDay * fanFactor.typical;
      const fanHigh = fanHoursPerDay * fanFactor.high;

      const laptopLow = laptopHoursPerDay * laptopFactor.low;
      const laptopTyp = laptopHoursPerDay * laptopFactor.typical;
      const laptopHigh = laptopHoursPerDay * laptopFactor.high;

      energy.low = Number((acLow + fanLow + laptopLow).toFixed(3));
      energy.typical = Number((acTyp + fanTyp + laptopTyp).toFixed(3));
      energy.high = Number((acHigh + fanHigh + laptopHigh).toFixed(3));
      break;
    }

    case 'LAUNDRY': {
      const { loadsPerWeek, machine } = activity;

      if (typeof loadsPerWeek !== 'number' || !Number.isFinite(loadsPerWeek) || loadsPerWeek < 0) {
        throw new EngineError('Laundry loads per week must be a non-negative finite number', 'INVALID_INPUT');
      }
      if (machine !== 'topLoad' && machine !== 'frontLoad') {
        throw new EngineError(`Invalid laundry machine type: '${machine}'`, 'INVALID_INPUT');
      }

      if (loadsPerWeek === 0) {
        return { water: { ...ZERO_RANGE }, energy: { ...ZERO_RANGE }, waste };
      }

      const dailyLoads = loadsPerWeek / 7;
      const waterFactorId =
        machine === 'frontLoad'
          ? 'laundry.water.frontLoad'
          : 'laundry.water.topLoad';

      const waterFactor = factors[waterFactorId];
      const energyFactor = factors['laundry.energy.machine'];

      if (!waterFactor || !energyFactor) {
        throw new EngineError('Missing laundry conversion factors', 'MISSING_FACTOR');
      }

      water.low = Number((dailyLoads * waterFactor.low).toFixed(2));
      water.typical = Number((dailyLoads * waterFactor.typical).toFixed(2));
      water.high = Number((dailyLoads * waterFactor.high).toFixed(2));

      energy.low = Number((dailyLoads * energyFactor.low).toFixed(3));
      energy.typical = Number((dailyLoads * energyFactor.typical).toFixed(3));
      energy.high = Number((dailyLoads * energyFactor.high).toFixed(3));
      break;
    }

    default:
      throw new EngineError(`Unknown activity type: '${(activity as any).type}'`, 'INVALID_ACTIVITY_TYPE');
  }

  return { water, energy, waste };
}

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

/**
 * Scales a daily activity result by the requested period multiplier.
 * Uses exact constants: day = 1, week = 7, month = 30, year = 365.
 */
export function scaleToPeriod(result: ActivityResult, period: Period): ActivityResult {
  const multiplier = PERIOD_MULTIPLIERS[period];
  if (multiplier === undefined) {
    throw new EngineError(`Unknown period: '${period}'`, 'INVALID_PERIOD');
  }

  function scaleRange(r: Range, precision: number): Range {
    return {
      low: Number((r.low * multiplier).toFixed(precision)),
      typical: Number((r.typical * multiplier).toFixed(precision)),
      high: Number((r.high * multiplier).toFixed(precision)),
    };
  }

  return {
    water: scaleRange(result.water, 2),
    energy: scaleRange(result.energy, 3),
    waste: scaleRange(result.waste, 2),
  };
}

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
