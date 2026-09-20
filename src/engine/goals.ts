import type {
  BaselineProfile,
  Factor,
  FactorSetPayload,
  FactorsMap,
  Range,
} from './types.ts';
import { EngineError, assertValidProfile } from './validation.ts';
import { toFactorsMap } from './factors.ts';
import { calculateProfile } from './profile.ts';
import { addDays, eachDay, compareISO, isValidISODate } from './dates.ts';
import {
  effectiveBaselineForDate,
  effectiveProfileForDate,
  type Deviation,
} from './deviations.ts';

export type GoalResource = 'water' | 'energy';
export type GoalPeriod = 'week' | 'month';
export type GoalStatus = 'active' | 'archived';
export type GoalProgressStatus =
  | 'getting_started'
  | 'on_pace'
  | 'not_there_yet'
  | 'achieved'
  | 'unavailable';

export interface Goal {
  id: string;
  userId?: string;
  resource: GoalResource;
  period: GoalPeriod;
  targetAmount: number;
  startDate: string; // YYYY-MM-DD
  referenceProfile: BaselineProfile;
  status: GoalStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalInput {
  resource: GoalResource;
  period: GoalPeriod;
  targetAmount: number;
}

export interface GoalValidationResult {
  errors: Record<string, string> | null;
  warnings: Record<string, string> | null;
}

export interface GoalProgressParams {
  goal: Goal;
  history: BaselineProfile[];
  deviations?: Deviation[];
  factorsByVersion: Record<string, FactorsMap | FactorSetPayload | Factor[]>;
  today: string; // YYYY-MM-DD
}

export interface GoalProgress {
  windowStart: string;
  windowEnd: string;
  daysCounted: number;
  unavailableDays: string[];
  saved: Range;
  target: number;
  ratioTypical: number;
  pace: Range;
  householdChanged: boolean;
  status: GoalProgressStatus;
  confirmedAtCautiousEstimate: boolean;
}

function sortRange(low: number, typical: number, high: number): Range {
  const vals = [low, typical, high].sort((a, b) => a - b);
  return { low: vals[0], typical: vals[1], high: vals[2] };
}

/**
 * Validates goal creation/update inputs against reference profile usage.
 * Errors:
 * - targetAmount <= 0
 * - targetAmount > reference typical use for period ("That's more than you currently use")
 * - targetAmount not finite
 * Warnings:
 * - targetAmount > 50% of reference typical use ("Ambitious: that's more than half of your typical use")
 */
export function validateGoalInput(
  input: GoalInput,
  referenceProfile: BaselineProfile,
  factorsInput: FactorsMap | FactorSetPayload | Factor[]
): GoalValidationResult {
  assertValidProfile(referenceProfile);
  const factors = toFactorsMap(factorsInput);

  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (input.resource !== 'water' && input.resource !== 'energy') {
    errors.resource = 'Resource must be water or energy.';
  }

  if (input.period !== 'week' && input.period !== 'month') {
    errors.period = 'Period must be week or month.';
  }

  const dailyRef = calculateProfile(referenceProfile, factors);
  const resourceTotals = (input.resource === 'water' || input.resource === 'energy') ? dailyRef[input.resource] : null;

  if (resourceTotals) {
    const multiplier = input.period === 'week' ? 7 : 30;
    const refPeriodTypical = resourceTotals.typical * multiplier;

    if (
      input.targetAmount === undefined ||
      input.targetAmount === null ||
      typeof input.targetAmount !== 'number' ||
      !Number.isFinite(input.targetAmount)
    ) {
      errors.targetAmount = 'Target amount must be a finite number.';
    } else if (input.targetAmount <= 0) {
      errors.targetAmount = 'Target amount must be greater than 0.';
    } else if (input.targetAmount > refPeriodTypical) {
      errors.targetAmount = "That's more than you currently use.";
    } else if (input.targetAmount > 0.5 * refPeriodTypical) {
      warnings.targetAmount = "Ambitious: that's more than half of your typical use.";
    }
  } else if (input.targetAmount === undefined || input.targetAmount === null || typeof input.targetAmount !== 'number' || !Number.isFinite(input.targetAmount)) {
    errors.targetAmount = 'Target amount must be a finite number.';
  } else if (input.targetAmount <= 0) {
    errors.targetAmount = 'Target amount must be greater than 0.';
  }

  return {
    errors: Object.keys(errors).length > 0 ? errors : null,
    warnings: Object.keys(warnings).length > 0 ? warnings : null,
  };
}

/**
 * Computes the progress of an active goal over the rolling N-day window ending today.
 * Window: last 7 days (week) or 30 days (month), constrained to days on or after goal.startDate.
 */
export function goalProgress({
  goal,
  history,
  deviations = [],
  factorsByVersion,
  today,
}: GoalProgressParams): GoalProgress {
  if (!isValidISODate(today)) {
    throw new EngineError(`Invalid today date string: "${today}"`, 'INVALID_INPUT');
  }
  if (!isValidISODate(goal.startDate)) {
    throw new EngineError(`Invalid goal start date: "${goal.startDate}"`, 'INVALID_INPUT');
  }

  const N = goal.period === 'week' ? 7 : 30;
  const windowStart = addDays(today, -(N - 1));
  const windowEnd = today;

  const windowDays = eachDay(windowStart, windowEnd);
  const unavailableDays: string[] = [];

  let savedLow = 0;
  let savedTypical = 0;
  let savedHigh = 0;
  let daysCounted = 0;
  let candidateDaysCount = 0;

  for (const day of windowDays) {
    // Only count days on or after goal.startDate
    if (compareISO(day, goal.startDate) < 0) {
      continue;
    }

    candidateDaysCount++;

    let baseline: BaselineProfile;
    try {
      baseline = effectiveBaselineForDate(history, day);
    } catch {
      unavailableDays.push(day);
      continue;
    }

    const versionFactorsInput = factorsByVersion[baseline.factorsVersion];
    if (!versionFactorsInput) {
      unavailableDays.push(day);
      continue;
    }

    const factors = toFactorsMap(versionFactorsInput);

    // Reference snapshot evaluated with this day's factor set
    const refDaily = calculateProfile(goal.referenceProfile, factors);

    // Actual habit with deviations evaluated with this day's factor set
    const effectiveHabit = effectiveProfileForDate(history, deviations, day).profile;
    const actDaily = calculateProfile(effectiveHabit, factors);

    const refRange = refDaily[goal.resource];
    const actRange = actDaily[goal.resource];

    const dLow = refRange.low - actRange.low;
    const dTyp = refRange.typical - actRange.typical;
    const dHigh = refRange.high - actRange.high;

    const daySaving = sortRange(dLow, dTyp, dHigh);

    savedLow += daySaving.low;
    savedTypical += daySaving.typical;
    savedHigh += daySaving.high;
    daysCounted++;
  }

  // Pace: Saving per period at TODAY'S effective baseline habits (ignoring deviations)
  let paceRange: Range = { low: 0, typical: 0, high: 0 };
  let todayBaseline: BaselineProfile | null = null;
  try {
    todayBaseline = effectiveBaselineForDate(history, today);
  } catch {
    todayBaseline = null;
  }

  if (todayBaseline) {
    const todayFactorsInput = factorsByVersion[todayBaseline.factorsVersion];
    if (todayFactorsInput) {
      const todayFactors = toFactorsMap(todayFactorsInput);
      const refToday = calculateProfile(goal.referenceProfile, todayFactors);
      const baseToday = calculateProfile(todayBaseline, todayFactors);

      const dLow = refToday[goal.resource].low - baseToday[goal.resource].low;
      const dTyp = refToday[goal.resource].typical - baseToday[goal.resource].typical;
      const dHigh = refToday[goal.resource].high - baseToday[goal.resource].high;

      const dailyPace = sortRange(dLow, dTyp, dHigh);
      const multiplier = goal.period === 'week' ? 7 : 30;

      paceRange = {
        low: Number((dailyPace.low * multiplier).toFixed(3)),
        typical: Number((dailyPace.typical * multiplier).toFixed(3)),
        high: Number((dailyPace.high * multiplier).toFixed(3)),
      };
    }
  }

  const saved: Range = {
    low: Number(savedLow.toFixed(3)),
    typical: Number(savedTypical.toFixed(3)),
    high: Number(savedHigh.toFixed(3)),
  };

  const ratioTypical = goal.targetAmount > 0 ? saved.typical / goal.targetAmount : 0;
  const confirmedAtCautiousEstimate = saved.low >= goal.targetAmount;

  const householdChanged = todayBaseline
    ? todayBaseline.householdSize !== goal.referenceProfile.householdSize
    : false;

  let status: GoalProgressStatus;

  if (candidateDaysCount > 0 && daysCounted === 0) {
    // All relevant days in window were missing factors or baselines
    status = 'unavailable';
  } else if (daysCounted < N) {
    status = 'getting_started';
  } else if (saved.typical >= goal.targetAmount) {
    status = 'achieved';
  } else if (paceRange.typical >= goal.targetAmount) {
    status = 'on_pace';
  } else {
    status = 'not_there_yet';
  }

  return {
    windowStart,
    windowEnd,
    daysCounted,
    unavailableDays,
    saved,
    target: goal.targetAmount,
    ratioTypical,
    pace: paceRange,
    householdChanged,
    status,
    confirmedAtCautiousEstimate,
  };
}
