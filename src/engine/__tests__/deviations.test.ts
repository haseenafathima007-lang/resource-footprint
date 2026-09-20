import { describe, it, expect } from 'vitest';
import type { BaselineProfile, FactorSetPayload } from '../types.ts';
import factorsV1 from '../../data/factors.v1.json';
import {
  validateDeviation,
  effectiveBaselineForDate,
  effectiveProfileForDate,
  calculateWindow,
  type Deviation,
} from '../deviations.ts';
import { EngineError } from '../validation.ts';

const BUNDLED_FACTORS = factorsV1 as unknown as FactorSetPayload;

const DEFAULT_PROFILE: BaselineProfile = {
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: 'electric',
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: 'topLoad',
  factorsVersion: '1.0.0',
  effectiveFrom: '2026-01-01',
};

describe('deviations engine module', () => {
  describe('validateDeviation', () => {
    const today = '2026-09-20';

    it('accepts a valid delta deviation', () => {
      const valid: Partial<Deviation> = {
        startDate: '2026-09-20',
        endDate: '2026-09-22',
        field: 'acHoursPerDay',
        mode: 'delta',
        value: 3,
        note: 'Heatwave',
      };
      expect(validateDeviation(valid, today)).toBeNull();
    });

    it('accepts a valid override deviation', () => {
      const valid: Partial<Deviation> = {
        startDate: '2026-09-25',
        endDate: '2026-09-28',
        field: 'showerMinutesPerDay',
        mode: 'override',
        value: 0,
      };
      expect(validateDeviation(valid, today)).toBeNull();
    });

    it('validates date formats and chronological order', () => {
      expect(validateDeviation({ startDate: 'bad', endDate: '2026-09-21', field: 'acHoursPerDay', mode: 'delta', value: 1 }, today)?.startDate)
        .toBeDefined();

      expect(validateDeviation({ startDate: '2026-09-22', endDate: '2026-09-20', field: 'acHoursPerDay', mode: 'delta', value: 1 }, today)?.endDate)
        .toMatch(/earlier than start date/);
    });

    it('rejects date range exceeding 365 days', () => {
      const res = validateDeviation(
        {
          startDate: '2025-09-20',
          endDate: '2026-09-22', // 367 days
          field: 'acHoursPerDay',
          mode: 'delta',
          value: 1,
        },
        today
      );
      expect(res?.endDate).toMatch(/cannot exceed 365 days/);
    });

    it('rejects start date more than 365 days in past', () => {
      const res = validateDeviation(
        {
          startDate: '2025-09-18', // today is 2026-09-20, >365 days ago
          endDate: '2025-09-19',
          field: 'acHoursPerDay',
          mode: 'delta',
          value: 1,
        },
        today
      );
      expect(res?.startDate).toMatch(/more than 365 days in the past/);
    });

    it('rejects end date more than 90 days in future', () => {
      const res = validateDeviation(
        {
          startDate: '2026-09-20',
          endDate: '2027-01-15', // >90 days
          field: 'acHoursPerDay',
          mode: 'delta',
          value: 1,
        },
        today
      );
      expect(res?.endDate).toMatch(/more than 90 days in the future/);
    });

    it('validates mode and field bounds', () => {
      // Delta zero is rejected
      expect(validateDeviation({ startDate: '2026-09-20', endDate: '2026-09-20', field: 'acHoursPerDay', mode: 'delta', value: 0 }, today)?.value)
        .toMatch(/cannot be zero/);

      // Delta exceeding max bound
      expect(validateDeviation({ startDate: '2026-09-20', endDate: '2026-09-20', field: 'acHoursPerDay', mode: 'delta', value: 25 }, today)?.value)
        .toMatch(/magnitude cannot exceed/);

      // Override out of bounds
      expect(validateDeviation({ startDate: '2026-09-20', endDate: '2026-09-20', field: 'showerMinutesPerDay', mode: 'override', value: 130 }, today)?.value)
        .toMatch(/Must be between/);

      expect(validateDeviation({ startDate: '2026-09-20', endDate: '2026-09-20', field: 'showerMinutesPerDay', mode: 'override', value: -1 }, today)?.value)
        .toMatch(/Must be between/);
    });

    it('validates note length', () => {
      const longNote = 'a'.repeat(201);
      expect(validateDeviation({ startDate: '2026-09-20', endDate: '2026-09-20', field: 'acHoursPerDay', mode: 'delta', value: 1, note: longNote }, today)?.note)
        .toMatch(/cannot exceed 200 characters/);
    });

    it('throws when today string is invalid', () => {
      expect(() => validateDeviation({}, 'bad-today')).toThrowError(EngineError);
    });
  });

  describe('effectiveBaselineForDate', () => {
    const history: BaselineProfile[] = [
      { ...DEFAULT_PROFILE, id: 'b1', effectiveFrom: '2026-09-01', acHoursPerDay: 2 },
      { ...DEFAULT_PROFILE, id: 'b2', effectiveFrom: '2026-09-10', acHoursPerDay: 5 },
      { ...DEFAULT_PROFILE, id: 'b3', effectiveFrom: '2026-09-20', acHoursPerDay: 8 },
    ];

    it('picks the latest baseline with effectiveFrom <= date', () => {
      expect(effectiveBaselineForDate(history, '2026-09-09').id).toBe('b1');
      expect(effectiveBaselineForDate(history, '2026-09-10').id).toBe('b2');
      expect(effectiveBaselineForDate(history, '2026-09-15').id).toBe('b2');
      expect(effectiveBaselineForDate(history, '2026-09-20').id).toBe('b3');
      expect(effectiveBaselineForDate(history, '2026-09-30').id).toBe('b3');
    });

    it('applies the earliest baseline backwards for dates before the first baseline', () => {
      // 2026-08-25 is before 2026-09-01 -> returns earliest (b1)
      expect(effectiveBaselineForDate(history, '2026-08-25').id).toBe('b1');
    });

    it('throws EngineError on empty history', () => {
      expect(() => effectiveBaselineForDate([], '2026-09-20')).toThrowError(EngineError);
    });
  });

  describe('effectiveProfileForDate', () => {
    const history: BaselineProfile[] = [DEFAULT_PROFILE];

    it('resolves single delta correctly', () => {
      const dev: Deviation = {
        id: 'd1',
        startDate: '2026-09-20',
        endDate: '2026-09-20',
        field: 'acHoursPerDay',
        mode: 'delta',
        value: 3,
      };

      const res = effectiveProfileForDate(history, [dev], '2026-09-20');
      // Baseline AC = 4, Delta +3 -> AC = 7
      expect(res.profile.acHoursPerDay).toBe(7);
      expect(res.applied.length).toBe(1);
      expect(res.clamped.length).toBe(0);
    });

    it('handles multiple overrides with latest created winning and deltas added', () => {
      // Earlier override AC 2, later override AC 6, delta +1 -> 6 + 1 = 7
      const dev1: Deviation = {
        id: 'd1',
        createdAt: '2026-09-18T10:00:00Z',
        startDate: '2026-09-20',
        endDate: '2026-09-20',
        field: 'acHoursPerDay',
        mode: 'override',
        value: 2,
      };
      const dev2: Deviation = {
        id: 'd2',
        createdAt: '2026-09-19T10:00:00Z', // later
        startDate: '2026-09-20',
        endDate: '2026-09-20',
        field: 'acHoursPerDay',
        mode: 'override',
        value: 6,
      };
      const dev3: Deviation = {
        id: 'd3',
        createdAt: '2026-09-19T11:00:00Z',
        startDate: '2026-09-20',
        endDate: '2026-09-20',
        field: 'acHoursPerDay',
        mode: 'delta',
        value: 1,
      };

      const res = effectiveProfileForDate(history, [dev1, dev2, dev3], '2026-09-20');
      expect(res.profile.acHoursPerDay).toBe(7);
      expect(res.applied.length).toBe(3);
    });

    it('adds multiple deltas together', () => {
      // Baseline AC = 4, deltas +1 and +2 -> 4 + 1 + 2 = 7
      const dev1: Deviation = { id: 'd1', startDate: '2026-09-20', endDate: '2026-09-20', field: 'acHoursPerDay', mode: 'delta', value: 1 };
      const dev2: Deviation = { id: 'd2', startDate: '2026-09-20', endDate: '2026-09-20', field: 'acHoursPerDay', mode: 'delta', value: 2 };

      const res = effectiveProfileForDate(history, [dev1, dev2], '2026-09-20');
      expect(res.profile.acHoursPerDay).toBe(7);
    });

    it('clamps to bounds when delta pushes beyond limits and records clamped field', () => {
      const highBaseline: BaselineProfile = { ...DEFAULT_PROFILE, acHoursPerDay: 23 };
      const dev: Deviation = { id: 'd1', startDate: '2026-09-20', endDate: '2026-09-20', field: 'acHoursPerDay', mode: 'delta', value: 5 };

      // 23 + 5 = 28 -> clamped to 24
      const res = effectiveProfileForDate([highBaseline], [dev], '2026-09-20');
      expect(res.profile.acHoursPerDay).toBe(24);
      expect(res.clamped).toContain('acHoursPerDay');
    });

    it('clamps negative values to 0', () => {
      const dev1: Deviation = { id: 'd1', startDate: '2026-09-20', endDate: '2026-09-20', field: 'showerMinutesPerDay', mode: 'override', value: 0 };
      const dev2: Deviation = { id: 'd2', startDate: '2026-09-20', endDate: '2026-09-20', field: 'showerMinutesPerDay', mode: 'delta', value: -5 };

      const res = effectiveProfileForDate(history, [dev1, dev2], '2026-09-20');
      expect(res.profile.showerMinutesPerDay).toBe(0);
      expect(res.clamped).toContain('showerMinutesPerDay');
    });

    it('ignores deviations outside date range (inclusive edges)', () => {
      const dev: Deviation = { id: 'd1', startDate: '2026-09-10', endDate: '2026-09-12', field: 'acHoursPerDay', mode: 'delta', value: 5 };

      // 09-09: outside (ac = 4)
      expect(effectiveProfileForDate(history, [dev], '2026-09-09').profile.acHoursPerDay).toBe(4);
      // 09-10: inside (ac = 9)
      expect(effectiveProfileForDate(history, [dev], '2026-09-10').profile.acHoursPerDay).toBe(9);
      // 09-12: inside (ac = 9)
      expect(effectiveProfileForDate(history, [dev], '2026-09-12').profile.acHoursPerDay).toBe(9);
      // 09-13: outside (ac = 4)
      expect(effectiveProfileForDate(history, [dev], '2026-09-13').profile.acHoursPerDay).toBe(4);
    });
  });

  describe('calculateWindow', () => {
    const factorsByVersion = { '1.0.0': BUNDLED_FACTORS };

    it('computes 1-day AC delta +3h with exact hand-computed values', () => {
      // AC 4h -> 7h (delta +3h).
      // AC power factors: low 0.9, typical 1.3, high 1.8 kWh/h.
      // Extra energy = 3 x (0.9, 1.3, 1.8) = 2.7 low, 3.9 typical, 5.4 high kWh.
      // Daily baseline energy:
      //   cooling: 4 x 1.3 = 5.2 (AC) + 6 x 0.06 = 0.36 (fan) + 6 x 0.05 = 0.30 (laptop) = 5.86 kWh
      //   shower: 10 min x 9 L/min = 90 L; 90 L x 0.029 kWh/L = 2.61 kWh
      //   laundry: (4/7) x 0.4 kWh = 0.22857 kWh
      //   total baseline energy = 5.86 + 2.61 + 0.22857 = 8.69857 kWh typical (approx 8.6986)
      // Actual day energy typical = 8.69857 + 3.9 = 12.59857 kWh
      // Water: no change (0 diff).
      const dev: Deviation = {
        id: 'd1',
        startDate: '2026-09-20',
        endDate: '2026-09-20',
        field: 'acHoursPerDay',
        mode: 'delta',
        value: 3,
      };

      const result = calculateWindow({
        history: [DEFAULT_PROFILE],
        deviations: [dev],
        factorsByVersion,
        startDate: '2026-09-20',
        endDate: '2026-09-20',
      });

      expect(result.days.length).toBe(1);
      expect(result.unavailableDays.length).toBe(0);

      const day = result.days[0];
      expect(day.difference.energy.typical).toBeCloseTo(3.9, 2);
      expect(day.difference.energy.low).toBeCloseTo(2.7, 2);
      expect(day.difference.energy.high).toBeCloseTo(5.4, 2);
      expect(day.actualTotals.energy.typical).toBeCloseTo(12.5986, 2);
      expect(day.difference.water.typical).toBe(0);

      expect(result.totals.difference.energy.typical).toBeCloseTo(3.9, 2);
      expect(result.totals.difference.water.typical).toBe(0);
    });

    it('computes 3-day shower override 0 with exact hand-computed values', () => {
      // Shower override 0 for 3 days (e.g. Away).
      // Daily shower water baseline: 10 x (6, 9, 12) = 60 low, 90 typical, 120 high L.
      // 3 days saved water = 3 x (60, 90, 120) = 180 low, 270 typical, 360 high L saved.
      // Daily shower energy baseline: water x (0.026, 0.029, 0.032) = 1.56 low, 2.61 typical, 3.84 high kWh.
      // 3 days saved energy = 3 x (1.56, 2.61, 3.84) = 4.68 low, 7.83 typical, 11.52 high kWh saved.
      const dev: Deviation = {
        id: 'd1',
        startDate: '2026-09-20',
        endDate: '2026-09-22',
        field: 'showerMinutesPerDay',
        mode: 'override',
        value: 0,
      };

      const result = calculateWindow({
        history: [DEFAULT_PROFILE],
        deviations: [dev],
        factorsByVersion,
        startDate: '2026-09-20',
        endDate: '2026-09-22',
      });

      expect(result.days.length).toBe(3);

      // In difference (actual - baseline):
      // water diff = -270 typical, sorted [-360, -270, -180]
      expect(result.totals.difference.water.typical).toBeCloseTo(-270, 1);
      expect(result.totals.difference.water.low).toBeCloseTo(-360, 1);
      expect(result.totals.difference.water.high).toBeCloseTo(-180, 1);

      // energy diff = -7.83 typical, sorted [-11.52, -7.83, -4.68]
      expect(result.totals.difference.energy.typical).toBeCloseTo(-7.83, 2);
      expect(result.totals.difference.energy.low).toBeCloseTo(-11.52, 2);
      expect(result.totals.difference.energy.high).toBeCloseTo(-4.68, 2);
    });

    it('computes 7-day laundry delta +2 loads/week', () => {
      // Laundry loads/week +2 for 7 days -> exactly 2 extra loads over the 7-day week.
      // Per load water: (100, 130, 170) L. 2 extra loads = 2 x (100, 130, 170) = 200 / 260 / 340 L total.
      // Per load energy: (0.2, 0.4, 0.8) kWh. 2 extra loads = 2 x (0.2, 0.4, 0.8) = 0.4 / 0.8 / 1.6 kWh total.
      const dev: Deviation = {
        id: 'd1',
        startDate: '2026-09-20',
        endDate: '2026-09-26', // 7 days inclusive
        field: 'laundryLoadsPerWeek',
        mode: 'delta',
        value: 2,
      };

      const result = calculateWindow({
        history: [DEFAULT_PROFILE],
        deviations: [dev],
        factorsByVersion,
        startDate: '2026-09-20',
        endDate: '2026-09-26',
      });

      expect(result.days.length).toBe(7);
      expect(result.totals.difference.water.typical).toBeCloseTo(260, 1);
      expect(result.totals.difference.water.low).toBeCloseTo(200, 1);
      expect(result.totals.difference.water.high).toBeCloseTo(340, 1);

      expect(result.totals.difference.energy.typical).toBeCloseTo(0.8, 2);
      expect(result.totals.difference.energy.low).toBeCloseTo(0.4, 2);
      expect(result.totals.difference.energy.high).toBeCloseTo(1.6, 2);
    });

    it('marks days with unresolvable factor sets as unavailable and excludes them from totals', () => {
      const bOld: BaselineProfile = { ...DEFAULT_PROFILE, effectiveFrom: '2026-01-01', factorsVersion: '0.9.0' };
      const bNew: BaselineProfile = { ...DEFAULT_PROFILE, effectiveFrom: '2026-09-02', factorsVersion: '1.0.0' };

      // factorsByVersion only has '1.0.0', missing '0.9.0'
      const result = calculateWindow({
        history: [bOld, bNew],
        deviations: [],
        factorsByVersion: { '1.0.0': BUNDLED_FACTORS },
        startDate: '2026-09-01',
        endDate: '2026-09-03',
      });

      // 2026-09-01 uses 0.9.0 -> unavailable
      // 2026-09-02 & 2026-09-03 use 1.0.0 -> computed (2 days in totals)
      expect(result.unavailableDays).toEqual(['2026-09-01']);
      expect(result.days.length).toBe(2);
      expect(result.totals.baseline.water.typical).toBeCloseTo(164.29 * 2, 0);
    });

    it('maintains range ordering low <= typical <= high across random deviations', () => {
      // Seeded-like diverse deviation test
      const devs: Deviation[] = [
        { id: '1', startDate: '2026-09-01', endDate: '2026-09-05', field: 'acHoursPerDay', mode: 'delta', value: -2 },
        { id: '2', startDate: '2026-09-03', endDate: '2026-09-07', field: 'showerMinutesPerDay', mode: 'override', value: 5 },
        { id: '3', startDate: '2026-09-06', endDate: '2026-09-10', field: 'laundryLoadsPerWeek', mode: 'delta', value: 3 },
      ];

      const result = calculateWindow({
        history: [DEFAULT_PROFILE],
        deviations: devs,
        factorsByVersion,
        startDate: '2026-09-01',
        endDate: '2026-09-10',
      });

      for (const d of result.days) {
        expect(d.baselineTotals.water.low).toBeLessThanOrEqual(d.baselineTotals.water.typical);
        expect(d.baselineTotals.water.typical).toBeLessThanOrEqual(d.baselineTotals.water.high);
        expect(d.actualTotals.water.low).toBeLessThanOrEqual(d.actualTotals.water.typical);
        expect(d.actualTotals.water.typical).toBeLessThanOrEqual(d.actualTotals.water.high);
        expect(d.difference.water.low).toBeLessThanOrEqual(d.difference.water.typical);
        expect(d.difference.water.typical).toBeLessThanOrEqual(d.difference.water.high);

        expect(d.baselineTotals.energy.low).toBeLessThanOrEqual(d.baselineTotals.energy.typical);
        expect(d.baselineTotals.energy.typical).toBeLessThanOrEqual(d.baselineTotals.energy.high);
        expect(d.actualTotals.energy.low).toBeLessThanOrEqual(d.actualTotals.energy.typical);
        expect(d.actualTotals.energy.typical).toBeLessThanOrEqual(d.actualTotals.energy.high);
        expect(d.difference.energy.low).toBeLessThanOrEqual(d.difference.energy.typical);
        expect(d.difference.energy.typical).toBeLessThanOrEqual(d.difference.energy.high);
      }

      expect(result.totals.difference.water.low).toBeLessThanOrEqual(result.totals.difference.water.typical);
      expect(result.totals.difference.water.typical).toBeLessThanOrEqual(result.totals.difference.water.high);
      expect(result.totals.difference.energy.low).toBeLessThanOrEqual(result.totals.difference.energy.typical);
      expect(result.totals.difference.energy.typical).toBeLessThanOrEqual(result.totals.difference.energy.high);
    });
  });
});
