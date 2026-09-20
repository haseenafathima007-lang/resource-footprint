import type { BaselineProfile, FactorSetPayload, Factor, FactorsMap, ActivityResult, Range } from './types.ts';
import { PROFILE_BOUNDS, EngineError } from './validation.ts';
import { calculateProfile } from './profile.ts';
import { toFactorsMap } from './factors.ts';
import { isValidISODate, addDays, daysBetween, eachDay, compareISO } from './dates.ts';

export type DeviationField =
  | 'showerMinutesPerDay'
  | 'acHoursPerDay'
  | 'fanHoursPerDay'
  | 'laptopHoursPerDay'
  | 'laundryLoadsPerWeek';

export const DEVIATION_FIELDS: DeviationField[] = [
  'showerMinutesPerDay',
  'acHoursPerDay',
  'fanHoursPerDay',
  'laptopHoursPerDay',
  'laundryLoadsPerWeek',
];

export interface Deviation {
  id: string;
  groupId?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  field: DeviationField;
  mode: 'delta' | 'override';
  value: number;
  note?: string | null;
  createdAt?: string;
}

export interface DayResult {
  date: string;
  baselineTotals: ActivityResult;
  actualTotals: ActivityResult;
  difference: ActivityResult;
  appliedDeviations: Deviation[];
  clampedFields: DeviationField[];
  factorsVersion: string;
}

export interface WindowCalculationResult {
  days: DayResult[];
  totals: {
    baseline: ActivityResult;
    actual: ActivityResult;
    difference: ActivityResult;
  };
  unavailableDays: string[];
}

function sortRange(low: number, typical: number, high: number): Range {
  const vals = [low, typical, high].sort((a, b) => a - b);
  return { low: vals[0], typical: vals[1], high: vals[2] };
}

/**
 * Validates a deviation object against dates, bounds, and rules relative to `today`.
 * Returns a map of field errors, or null if valid.
 */
export function validateDeviation(
  d: Partial<Deviation>,
  today: string
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!isValidISODate(today)) {
    throw new EngineError(`Invalid today date string provided to validateDeviation: "${today}"`, 'INVALID_INPUT');
  }

  // 1. Dates validation
  if (!d.startDate || !isValidISODate(d.startDate)) {
    errors.startDate = 'Start date must be a valid date (YYYY-MM-DD).';
  }

  if (!d.endDate || !isValidISODate(d.endDate)) {
    errors.endDate = 'End date must be a valid date (YYYY-MM-DD).';
  }

  if (d.startDate && isValidISODate(d.startDate) && d.endDate && isValidISODate(d.endDate)) {
    if (compareISO(d.startDate, d.endDate) > 0) {
      errors.endDate = 'End date cannot be earlier than start date.';
    } else {
      const rangeDays = daysBetween(d.startDate, d.endDate);
      if (rangeDays > 365) {
        errors.endDate = 'Date range cannot exceed 365 days.';
      }
    }

    const minAllowedStart = addDays(today, -365);
    if (compareISO(d.startDate, minAllowedStart) < 0) {
      errors.startDate = 'Start date cannot be more than 365 days in the past.';
    }

    const maxAllowedEnd = addDays(today, 90);
    if (!errors.endDate && compareISO(d.endDate, maxAllowedEnd) > 0) {
      errors.endDate = 'End date cannot be more than 90 days in the future.';
    }
  }

  // 2. Field validation
  if (!d.field || !DEVIATION_FIELDS.includes(d.field as DeviationField)) {
    errors.field = `Field must be one of: ${DEVIATION_FIELDS.join(', ')}.`;
  }

  // 3. Mode validation
  if (!d.mode || (d.mode !== 'delta' && d.mode !== 'override')) {
    errors.mode = "Mode must be either 'delta' or 'override'.";
  }

  // 4. Value validation
  if (d.value === undefined || typeof d.value !== 'number' || !Number.isFinite(d.value)) {
    errors.value = 'Value must be a finite number.';
  } else if (d.field && DEVIATION_FIELDS.includes(d.field as DeviationField)) {
    const bounds = PROFILE_BOUNDS[d.field as DeviationField];
    if (d.mode === 'override') {
      if (d.value < bounds.min || d.value > bounds.max) {
        errors.value = `Must be between ${bounds.min} and ${bounds.max}.`;
      }
    } else if (d.mode === 'delta') {
      if (d.value === 0) {
        errors.value = 'Delta value cannot be zero.';
      } else if (Math.abs(d.value) > bounds.max) {
        errors.value = `Delta magnitude cannot exceed ±${bounds.max}.`;
      }
    }
  }

  // 5. Note validation
  if (d.note !== undefined && d.note !== null) {
    if (typeof d.note !== 'string') {
      errors.note = 'Note must be a string.';
    } else if (d.note.trim().length > 200) {
      errors.note = 'Note cannot exceed 200 characters.';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Determines the effective baseline profile for a given calendar date from a baseline history list.
 * Latest baseline with effectiveFrom <= date is used.
 * If date is before the earliest baseline, uses the earliest baseline (backward rule).
 */
export function effectiveBaselineForDate(
  history: BaselineProfile[],
  date: string
): BaselineProfile {
  if (!history || history.length === 0) {
    throw new EngineError('Cannot determine effective baseline from empty history', 'EMPTY_BASELINE_HISTORY');
  }

  if (!isValidISODate(date)) {
    throw new EngineError(`Invalid date passed to effectiveBaselineForDate: "${date}"`, 'INVALID_INPUT');
  }

  const sorted = [...history].sort((a, b) => compareISO(a.effectiveFrom, b.effectiveFrom));
  const applicable = sorted.filter((b) => compareISO(b.effectiveFrom, date) <= 0);

  if (applicable.length > 0) {
    return applicable[applicable.length - 1];
  }

  // Date is before the earliest baseline in history -> apply earliest baseline backwards
  return sorted[0];
}

/**
 * Computes the effective habit profile for a specific date, resolving overrides, deltas, and bounds clamping.
 */
export function effectiveProfileForDate(
  history: BaselineProfile[],
  deviations: Deviation[],
  date: string
): { profile: BaselineProfile; applied: Deviation[]; clamped: DeviationField[] } {
  const base = effectiveBaselineForDate(history, date);

  const coveringDeviations = deviations.filter(
    (d) => compareISO(d.startDate, date) <= 0 && compareISO(date, d.endDate) <= 0
  );

  const profile: BaselineProfile = { ...base };
  const applied: Deviation[] = [];
  const clamped: DeviationField[] = [];

  for (const field of DEVIATION_FIELDS) {
    const fieldDevs = coveringDeviations.filter((d) => d.field === field);
    if (fieldDevs.length === 0) {
      continue;
    }

    applied.push(...fieldDevs);

    const overrides = fieldDevs.filter((d) => d.mode === 'override');
    let baseVal: number;

    if (overrides.length > 0) {
      // Pick most recently created override; tie-break on id
      const winningOverride = [...overrides].sort((a, b) => {
        const ca = a.createdAt || '';
        const cb = b.createdAt || '';
        if (ca !== cb) {
          return cb.localeCompare(ca);
        }
        return b.id.localeCompare(a.id);
      })[0];

      baseVal = winningOverride.value;
    } else {
      baseVal = Number(base[field]);
    }

    // Add all deltas
    const deltas = fieldDevs.filter((d) => d.mode === 'delta');
    const totalDelta = deltas.reduce((sum, d) => sum + d.value, 0);
    const candidateValue = baseVal + totalDelta;

    // Clamp to bounds
    const bounds = PROFILE_BOUNDS[field];
    const clampedValue = Math.min(bounds.max, Math.max(bounds.min, candidateValue));

    if (clampedValue !== candidateValue) {
      clamped.push(field);
    }

    (profile as unknown as Record<string, unknown>)[field] = clampedValue;
  }

  return { profile, applied, clamped };
}

/**
 * Calculates resource usage day-by-day across a window [startDate, endDate], computing baseline vs actual.
 * Days with unresolvable factor sets are marked unavailable and excluded from totals.
 */
export function calculateWindow(input: {
  history: BaselineProfile[];
  deviations: Deviation[];
  factorsByVersion: Record<string, FactorSetPayload | Factor[] | FactorsMap>;
  startDate: string;
  endDate: string;
}): WindowCalculationResult {
  if (!isValidISODate(input.startDate) || !isValidISODate(input.endDate)) {
    throw new EngineError('Invalid startDate or endDate provided to calculateWindow', 'INVALID_INPUT');
  }

  const days = eachDay(input.startDate, input.endDate);
  const dayResults: DayResult[] = [];
  const unavailableDays: string[] = [];

  const baselineTotals: ActivityResult = {
    water: { low: 0, typical: 0, high: 0 },
    energy: { low: 0, typical: 0, high: 0 },
    waste: { low: 0, typical: 0, high: 0 },
  };

  const actualTotals: ActivityResult = {
    water: { low: 0, typical: 0, high: 0 },
    energy: { low: 0, typical: 0, high: 0 },
    waste: { low: 0, typical: 0, high: 0 },
  };

  for (const day of days) {
    const baseline = effectiveBaselineForDate(input.history, day);
    const factorData = input.factorsByVersion[baseline.factorsVersion];

    if (!factorData) {
      unavailableDays.push(day);
      continue;
    }

    const factorsMap =
      factorData instanceof Map
        ? factorData
        : toFactorsMap(factorData as FactorSetPayload);

    const baseRes = calculateProfile(baseline, factorsMap);
    const { profile: effProfile, applied, clamped } = effectiveProfileForDate(
      input.history,
      input.deviations,
      day
    );
    const actRes = calculateProfile(effProfile, factorsMap);

    const diffWater = sortRange(
      actRes.water.low - baseRes.water.low,
      actRes.water.typical - baseRes.water.typical,
      actRes.water.high - baseRes.water.high
    );

    const diffEnergy = sortRange(
      actRes.energy.low - baseRes.energy.low,
      actRes.energy.typical - baseRes.energy.typical,
      actRes.energy.high - baseRes.energy.high
    );

    const diffWaste: Range = { low: 0, typical: 0, high: 0 };

    dayResults.push({
      date: day,
      baselineTotals: baseRes,
      actualTotals: actRes,
      difference: {
        water: diffWater,
        energy: diffEnergy,
        waste: diffWaste,
      },
      appliedDeviations: applied,
      clampedFields: clamped,
      factorsVersion: baseline.factorsVersion,
    });

    // Accumulate totals
    baselineTotals.water.low += baseRes.water.low;
    baselineTotals.water.typical += baseRes.water.typical;
    baselineTotals.water.high += baseRes.water.high;
    baselineTotals.energy.low += baseRes.energy.low;
    baselineTotals.energy.typical += baseRes.energy.typical;
    baselineTotals.energy.high += baseRes.energy.high;

    actualTotals.water.low += actRes.water.low;
    actualTotals.water.typical += actRes.water.typical;
    actualTotals.water.high += actRes.water.high;
    actualTotals.energy.low += actRes.energy.low;
    actualTotals.energy.typical += actRes.energy.typical;
    actualTotals.energy.high += actRes.energy.high;
  }

  const totDiffWater = sortRange(
    actualTotals.water.low - baselineTotals.water.low,
    actualTotals.water.typical - baselineTotals.water.typical,
    actualTotals.water.high - baselineTotals.water.high
  );

  const totDiffEnergy = sortRange(
    actualTotals.energy.low - baselineTotals.energy.low,
    actualTotals.energy.typical - baselineTotals.energy.typical,
    actualTotals.energy.high - baselineTotals.energy.high
  );

  const totDiffWaste: Range = { low: 0, typical: 0, high: 0 };

  return {
    days: dayResults,
    totals: {
      baseline: baselineTotals,
      actual: actualTotals,
      difference: {
        water: totDiffWater,
        energy: totDiffEnergy,
        waste: totDiffWaste,
      },
    },
    unavailableDays,
  };
}
