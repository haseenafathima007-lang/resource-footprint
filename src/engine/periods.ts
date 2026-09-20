import type { ActivityResult, Period, Range } from './types.ts';
import { EngineError } from './validation.ts';

export const PERIOD_MULTIPLIERS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
} as const;

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
