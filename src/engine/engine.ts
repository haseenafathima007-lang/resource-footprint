import type {
  ActivityInput,
  ActivityResult,
  Factor,
  FactorSetPayload,
  FactorsMap,
  Range,
} from '../types/index.ts';

export const PROFILE_BOUNDS = {
  householdSize: { min: 1, max: 20 },
  showerMinutesPerDay: { min: 0, max: 120 },
  acHoursPerDay: { min: 0, max: 24 },
  fanHoursPerDay: { min: 0, max: 24 },
  laptopHoursPerDay: { min: 0, max: 24 },
  laundryLoadsPerWeek: { min: 0, max: 50 },
} as const;

export function validateProfile(
  data: Record<string, unknown>
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (data.householdSize !== undefined) {
    const val = Number(data.householdSize);
    if (!Number.isInteger(val) || val < PROFILE_BOUNDS.householdSize.min || val > PROFILE_BOUNDS.householdSize.max) {
      errors.householdSize = `Household size must be an integer between ${PROFILE_BOUNDS.householdSize.min} and ${PROFILE_BOUNDS.householdSize.max}`;
    }
  }

  if (data.showerMinutesPerDay !== undefined) {
    const val = Number(data.showerMinutesPerDay);
    if (isNaN(val) || val < PROFILE_BOUNDS.showerMinutesPerDay.min || val > PROFILE_BOUNDS.showerMinutesPerDay.max) {
      errors.showerMinutesPerDay = `Shower minutes per day must be between ${PROFILE_BOUNDS.showerMinutesPerDay.min} and ${PROFILE_BOUNDS.showerMinutesPerDay.max}`;
    }
  }

  if (data.acHoursPerDay !== undefined) {
    const val = Number(data.acHoursPerDay);
    if (isNaN(val) || val < PROFILE_BOUNDS.acHoursPerDay.min || val > PROFILE_BOUNDS.acHoursPerDay.max) {
      errors.acHoursPerDay = `AC hours per day must be between ${PROFILE_BOUNDS.acHoursPerDay.min} and ${PROFILE_BOUNDS.acHoursPerDay.max}`;
    }
  }

  if (data.fanHoursPerDay !== undefined) {
    const val = Number(data.fanHoursPerDay);
    if (isNaN(val) || val < PROFILE_BOUNDS.fanHoursPerDay.min || val > PROFILE_BOUNDS.fanHoursPerDay.max) {
      errors.fanHoursPerDay = `Fan hours per day must be between ${PROFILE_BOUNDS.fanHoursPerDay.min} and ${PROFILE_BOUNDS.fanHoursPerDay.max}`;
    }
  }

  if (data.laptopHoursPerDay !== undefined) {
    const val = Number(data.laptopHoursPerDay);
    if (isNaN(val) || val < PROFILE_BOUNDS.laptopHoursPerDay.min || val > PROFILE_BOUNDS.laptopHoursPerDay.max) {
      errors.laptopHoursPerDay = `Laptop hours per day must be between ${PROFILE_BOUNDS.laptopHoursPerDay.min} and ${PROFILE_BOUNDS.laptopHoursPerDay.max}`;
    }
  }

  if (data.laundryLoadsPerWeek !== undefined) {
    const val = Number(data.laundryLoadsPerWeek);
    if (isNaN(val) || val < PROFILE_BOUNDS.laundryLoadsPerWeek.min || val > PROFILE_BOUNDS.laundryLoadsPerWeek.max) {
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

export function toFactorsMap(
  factors: FactorsMap | FactorSetPayload | Factor[]
): FactorsMap {
  if (Array.isArray(factors)) {
    return factors.reduce<FactorsMap>((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});
  }
  if ('factors' in factors && Array.isArray(factors.factors)) {
    return factors.factors.reduce<FactorsMap>((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});
  }
  return factors;
}

const ZERO_RANGE: Range = { low: 0, typical: 0, high: 0 };

export function calculate(
  activity: ActivityInput,
  factorsInput: FactorsMap | FactorSetPayload | Factor[]
): ActivityResult {
  const factors = toFactorsMap(factorsInput);

  const water: Range = { low: 0, typical: 0, high: 0 };
  const energy: Range = { low: 0, typical: 0, high: 0 };
  const waste: Range = { ...ZERO_RANGE }; // 0 in MVP, kept in data model

  switch (activity.type) {
    case 'SHOWER': {
      const minutes = Math.max(0, activity.minutesPerDay);
      if (minutes === 0) {
        return { water: { ...ZERO_RANGE }, energy: { ...ZERO_RANGE }, waste };
      }

      const flow = factors['shower.flow'];
      if (flow) {
        water.low = Number((minutes * flow.low).toFixed(2));
        water.typical = Number((minutes * flow.typical).toFixed(2));
        water.high = Number((minutes * flow.high).toFixed(2));
      }

      if (activity.heater === 'electric') {
        const heating = factors['shower.heating'];
        if (heating) {
          energy.low = Number((water.low * heating.low).toFixed(3));
          energy.typical = Number((water.typical * heating.typical).toFixed(3));
          energy.high = Number((water.high * heating.high).toFixed(3));
        }
      }
      break;
    }

    case 'COOLING_APPLIANCES': {
      const acHours = Math.max(0, activity.acHoursPerDay);
      const fanHours = Math.max(0, activity.fanHoursPerDay);
      const laptopHours = Math.max(0, activity.laptopHoursPerDay);

      const acFactor = factors['ac.power'];
      const fanFactor = factors['fan.power'];
      const laptopFactor = factors['laptop.power'];

      const acLow = acFactor ? acHours * acFactor.low : 0;
      const acTyp = acFactor ? acHours * acFactor.typical : 0;
      const acHigh = acFactor ? acHours * acFactor.high : 0;

      const fanLow = fanFactor ? fanHours * fanFactor.low : 0;
      const fanTyp = fanFactor ? fanHours * fanFactor.typical : 0;
      const fanHigh = fanFactor ? fanHours * fanFactor.high : 0;

      const laptopLow = laptopFactor ? laptopHours * laptopFactor.low : 0;
      const laptopTyp = laptopFactor ? laptopHours * laptopFactor.typical : 0;
      const laptopHigh = laptopFactor ? laptopHours * laptopFactor.high : 0;

      energy.low = Number((acLow + fanLow + laptopLow).toFixed(3));
      energy.typical = Number((acTyp + fanTyp + laptopTyp).toFixed(3));
      energy.high = Number((acHigh + fanHigh + laptopHigh).toFixed(3));
      break;
    }

    case 'LAUNDRY': {
      const loads = Math.max(0, activity.loadsPerWeek);
      if (loads === 0) {
        return { water: { ...ZERO_RANGE }, energy: { ...ZERO_RANGE }, waste };
      }

      // Convert loads/week to daily average (/ 7)
      const dailyLoads = loads / 7;
      const waterFactorId =
        activity.machine === 'frontLoad'
          ? 'laundry.water.frontLoad'
          : 'laundry.water.topLoad';

      const waterFactor = factors[waterFactorId];
      if (waterFactor) {
        water.low = Number((dailyLoads * waterFactor.low).toFixed(2));
        water.typical = Number((dailyLoads * waterFactor.typical).toFixed(2));
        water.high = Number((dailyLoads * waterFactor.high).toFixed(2));
      }

      const energyFactor = factors['laundry.energy.machine'];
      if (energyFactor) {
        energy.low = Number((dailyLoads * energyFactor.low).toFixed(3));
        energy.typical = Number((dailyLoads * energyFactor.typical).toFixed(3));
        energy.high = Number((dailyLoads * energyFactor.high).toFixed(3));
      }
      break;
    }
  }

  return { water, energy, waste };
}
