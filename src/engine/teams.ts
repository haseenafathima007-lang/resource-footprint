import type {
  BaselineProfile,
  Factor,
  FactorSetPayload,
  FactorsMap,
} from './types.ts';
import { EngineError, assertValidProfile } from './validation.ts';
import { toFactorsMap } from './factors.ts';
import { calculateProfile } from './profile.ts';
import { eachDay, isValidISODate, compareISO } from './dates.ts';
import {
  effectiveBaselineForDate,
  effectiveProfileForDate,
  type Deviation,
} from './deviations.ts';

export interface DailySaving {
  day: string; // YYYY-MM-DD
  water: number; // L/day typical saved
  energy: number; // kWh/day typical saved
}

export interface MemberDailySavingsParams {
  snapshot: BaselineProfile;
  history: BaselineProfile[];
  deviations?: Deviation[];
  factorsByVersion: Record<string, FactorsMap | FactorSetPayload | Factor[]>;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface MemberDailySavingsResult {
  days: DailySaving[];
  unavailableDays: string[];
}

export interface ContributionRow {
  day: string;
  water_saved_l: number;
  energy_saved_kwh: number;
}

/**
 * Calculates a member's daily typical savings for each day in a date window [startDate, endDate].
 * Per day `d`:
 *   saving = calculateProfile(snapshot, factors) minus calculateProfile(effectiveProfile(d), factors)
 * If factors for day `d`'s effective baseline version are missing, day `d` is listed as unavailable.
 */
export function memberDailySavings(
  params: MemberDailySavingsParams
): MemberDailySavingsResult {
  const {
    snapshot,
    history,
    deviations = [],
    factorsByVersion,
    startDate,
    endDate,
  } = params;

  assertValidProfile(snapshot);

  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    throw new EngineError('Invalid start or end date for member daily savings', 'INVALID_INPUT');
  }

  if (compareISO(startDate, endDate) > 0) {
    throw new EngineError('startDate cannot be after endDate', 'INVALID_INPUT');
  }

  const allDays = eachDay(startDate, endDate);
  const days: DailySaving[] = [];
  const unavailableDays: string[] = [];

  for (const day of allDays) {
    // Determine effective baseline version in effect on `day`
    const effectiveBase = effectiveBaselineForDate(history.length > 0 ? history : [snapshot], day);
    const version = effectiveBase.factorsVersion || snapshot.factorsVersion;
    const rawFactors = factorsByVersion[version];

    if (!rawFactors) {
      unavailableDays.push(day);
      continue;
    }

    const factorsMap = toFactorsMap(rawFactors);

    // Baseline daily usage snapshot
    const baselineResult = calculateProfile(snapshot, factorsMap);

    // Effective actual daily usage on `day` considering baselines and deviations
    const effectiveRes = effectiveProfileForDate(
      history.length > 0 ? history : [snapshot],
      deviations,
      day
    );
    const actualResult = calculateProfile(effectiveRes.profile, factorsMap);

    const waterSaved = baselineResult.water.typical - actualResult.water.typical;
    const energySaved = baselineResult.energy.typical - actualResult.energy.typical;

    days.push({
      day,
      water: waterSaved,
      energy: energySaved,
    });
  }

  return { days, unavailableDays };
}

/**
 * Converts daily typical savings into DB contribution payload rows,
 * rounding water to 2 decimal places and energy to 3 decimal places.
 */
export function contributionRows(days: DailySaving[]): ContributionRow[] {
  return days.map((d) => ({
    day: d.day,
    water_saved_l: Math.round(d.water * 100) / 100,
    energy_saved_kwh: Math.round(d.energy * 1000) / 1000,
  }));
}

/**
 * Calculates percentage reduction for a resource over a counted window.
 * Throws EngineError if baselineDaily <= 0 or daysCounted <= 0.
 */
export function percentReduction(
  savedTotal: number,
  baselineDaily: number,
  daysCounted: number
): number {
  if (!Number.isFinite(baselineDaily) || baselineDaily <= 0) {
    throw new EngineError('baselineDaily must be a positive finite number', 'INVALID_INPUT');
  }
  if (!Number.isFinite(daysCounted) || daysCounted <= 0) {
    throw new EngineError('daysCounted must be a positive finite integer', 'INVALID_INPUT');
  }

  return (savedTotal / (baselineDaily * daysCounted)) * 100;
}

/**
 * Calculates raw progress ratio against a team target.
 * Throws EngineError if target <= 0.
 */
export function teamTargetProgress(total: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) {
    throw new EngineError('Target must be a positive finite number', 'INVALID_INPUT');
  }
  if (!Number.isFinite(total)) {
    throw new EngineError('Total must be a finite number', 'INVALID_INPUT');
  }

  return total / target;
}
