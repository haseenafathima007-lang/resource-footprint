import type {
  ActivityInput,
  ActivityResult,
  Factor,
  FactorSetPayload,
  FactorsMap,
  Range,
} from './types.ts';
import { EngineError } from './validation.ts';
import { toFactorsMap } from './factors.ts';

export const ZERO_RANGE: Range = { low: 0, typical: 0, high: 0 };

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
