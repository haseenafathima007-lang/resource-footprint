import { describe, it, expect } from 'vitest';
import { scaleToPeriod, PERIOD_MULTIPLIERS, EngineError } from '../engine.ts';
import type { ActivityResult } from '../../types/calculation.ts';

describe('Engine: scaleToPeriod', () => {
  const dailyResult: ActivityResult = {
    water: { low: 50, typical: 100, high: 150 },
    energy: { low: 2.0, typical: 4.0, high: 6.0 },
    waste: { low: 0, typical: 0, high: 0 },
  };

  it('verifies exact period multiplier constants: 7, 30, 365', () => {
    expect(PERIOD_MULTIPLIERS.day).toBe(1);
    expect(PERIOD_MULTIPLIERS.week).toBe(7);
    expect(PERIOD_MULTIPLIERS.month).toBe(30);
    expect(PERIOD_MULTIPLIERS.year).toBe(365);
  });

  it('scales to week using multiplier 7 with hand-computed arithmetic', () => {
    // Hand-computed:
    // Water:  7 * (50, 100, 150) = (350.00, 700.00, 1050.00) L
    // Energy: 7 * (2.0, 4.0, 6.0) = (14.000, 28.000, 42.000) kWh
    const weekly = scaleToPeriod(dailyResult, 'week');

    expect(weekly.water.low).toBe(350);
    expect(weekly.water.typical).toBe(700);
    expect(weekly.water.high).toBe(1050);

    expect(weekly.energy.low).toBe(14);
    expect(weekly.energy.typical).toBe(28);
    expect(weekly.energy.high).toBe(42);
  });

  it('scales to month using multiplier 30 with hand-computed arithmetic', () => {
    // Hand-computed:
    // Water:  30 * (50, 100, 150) = (1500.00, 3000.00, 4500.00) L
    // Energy: 30 * (2.0, 4.0, 6.0) = (60.000, 120.000, 180.000) kWh
    const monthly = scaleToPeriod(dailyResult, 'month');

    expect(monthly.water.low).toBe(1500);
    expect(monthly.water.typical).toBe(3000);
    expect(monthly.water.high).toBe(4500);

    expect(monthly.energy.low).toBe(60);
    expect(monthly.energy.typical).toBe(120);
    expect(monthly.energy.high).toBe(180);
  });

  it('scales to year using multiplier 365 with hand-computed arithmetic', () => {
    // Hand-computed:
    // Water:  365 * (50, 100, 150) = (18250.00, 36500.00, 54750.00) L
    // Energy: 365 * (2.0, 4.0, 6.0) = (730.000, 1460.000, 2190.000) kWh
    const yearly = scaleToPeriod(dailyResult, 'year');

    expect(yearly.water.low).toBe(18250);
    expect(yearly.water.typical).toBe(36500);
    expect(yearly.water.high).toBe(54750);

    expect(yearly.energy.low).toBe(730);
    expect(yearly.energy.typical).toBe(1460);
    expect(yearly.energy.high).toBe(2190);
  });

  it('throws EngineError for unsupported period', () => {
    expect(() => scaleToPeriod(dailyResult, 'decade' as any)).toThrowError(EngineError);
  });
});
