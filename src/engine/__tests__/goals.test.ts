import { describe, it, expect } from 'vitest';
import {
  validateGoalInput,
  goalProgress,
  type Goal,
  type BaselineProfile,
  type Deviation,
} from '@/engine';
import factorsData from '../../data/factors.v1.json';

describe('Engine: goals', () => {
  const factors = factorsData.factors;
  const factorsByVersion = {
    [factorsData.version]: factorsData,
  };

  const baselineA: BaselineProfile = {
    id: 'base-a',
    userId: 'user-1',
    effectiveFrom: '2026-09-01',
    householdSize: 1,
    showerMinutesPerDay: 10,
    showerHeater: 'electric',
    acHoursPerDay: 4,
    fanHoursPerDay: 6,
    laptopHoursPerDay: 6,
    laundryLoadsPerWeek: 4,
    laundryMachine: 'topLoad',
    factorsVersion: factorsData.version,
  };

  const baselineB: BaselineProfile = {
    ...baselineA,
    id: 'base-b',
    effectiveFrom: '2026-09-10',
    showerMinutesPerDay: 7, // 3 min reduction -> saves 18/27/36 L/day
  };

  const waterGoal: Goal = {
    id: 'goal-1',
    userId: 'user-1',
    resource: 'water',
    period: 'week',
    targetAmount: 150,
    startDate: '2026-09-01',
    referenceProfile: baselineA,
    status: 'active',
  };

  describe('validateGoalInput', () => {
    it('validates targets against reference profile usage and generates ambitious warnings', () => {
      // Reference weekly water for baselineA:
      // Daily = 90 L shower + (4/7)*130 L laundry = 90 + 74.2857 = 164.2857 L/day
      // Weekly = 164.2857 * 7 = 1150 L/week
      //
      // 1. Target 1200 exceeds 1150 -> error
      const res1 = validateGoalInput(
        { resource: 'water', period: 'week', targetAmount: 1200 },
        baselineA,
        factors
      );
      expect(res1.errors?.targetAmount).toMatch(/more than you currently use/i);

      // 2. Target 600 > 50% of 1150 (575) -> ambitious warning
      const res2 = validateGoalInput(
        { resource: 'water', period: 'week', targetAmount: 600 },
        baselineA,
        factors
      );
      expect(res2.errors).toBeNull();
      expect(res2.warnings?.targetAmount).toMatch(/ambitious/i);

      // 3. Target 300 <= 575 -> no errors, no warnings
      const res3 = validateGoalInput(
        { resource: 'water', period: 'week', targetAmount: 300 },
        baselineA,
        factors
      );
      expect(res3.errors).toBeNull();
      expect(res3.warnings).toBeNull();

      // 4. Target <= 0 or not finite -> error
      const res4 = validateGoalInput(
        { resource: 'water', period: 'week', targetAmount: 0 },
        baselineA,
        factors
      );
      expect(res4.errors?.targetAmount).toMatch(/greater than 0/i);

      const res5 = validateGoalInput(
        { resource: 'water', period: 'week', targetAmount: -50 },
        baselineA,
        factors
      );
      expect(res5.errors?.targetAmount).toMatch(/greater than 0/i);

      // 5. Month period validation
      const res6 = validateGoalInput(
        { resource: 'energy', period: 'month', targetAmount: 200 },
        baselineA,
        factors
      );
      expect(res6.errors).toBeNull();

      // 6. Bad resource or period
      const res7 = validateGoalInput(
        { resource: 'bad' as any, period: 'invalid' as any, targetAmount: 50 },
        baselineA,
        factors
      );
      expect(res7.errors?.resource).toBeDefined();
      expect(res7.errors?.period).toBeDefined();

      // 7. Non-finite targetAmount
      const res8 = validateGoalInput(
        { resource: 'water', period: 'week', targetAmount: NaN },
        baselineA,
        factors
      );
      expect(res8.errors?.targetAmount).toMatch(/finite number/i);
    });

    it('throws on invalid dates in goalProgress', () => {
      expect(() =>
        goalProgress({
          goal: waterGoal,
          history: [baselineA],
          today: 'bad-date',
          factorsByVersion,
        })
      ).toThrowError();

      expect(() =>
        goalProgress({
          goal: { ...waterGoal, startDate: 'bad-start' },
          history: [baselineA],
          today: '2026-09-16',
          factorsByVersion,
        })
      ).toThrowError();
    });
  });

  describe('goalProgress hand-computed arithmetic', () => {
    it('evaluates status="achieved" when full 7-day window meets target', () => {
      // Window: 2026-09-10 to 2026-09-16 (7 days, all under Baseline B)
      // Daily saving: 3 min * (6, 9, 12) = (18, 27, 36) L
      // Saved in 7 days: 7 * (18, 27, 36) = (126, 189, 252) L
      // Typical 189 >= target 150 -> status "achieved"
      // Low 126 < 150 -> confirmedAtCautiousEstimate = false
      // Pace: 27 * 7 = 189 L/week
      const progress = goalProgress({
        goal: waterGoal,
        history: [baselineA, baselineB],
        today: '2026-09-16',
        factorsByVersion,
      });

      expect(progress.daysCounted).toBe(7);
      expect(progress.windowStart).toBe('2026-09-10');
      expect(progress.windowEnd).toBe('2026-09-16');
      expect(progress.saved).toEqual({ low: 126, typical: 189, high: 252 });
      expect(progress.ratioTypical).toBeCloseTo(1.26, 2);
      expect(progress.pace).toEqual({ low: 126, typical: 189, high: 252 });
      expect(progress.status).toBe('achieved');
      expect(progress.confirmedAtCautiousEstimate).toBe(false);
      expect(progress.householdChanged).toBe(false);
    });

    it('evaluates status="on_pace" when window has partial savings but today pace meets target', () => {
      // Window: 2026-09-06 to 2026-09-12 (7 days total)
      // Days 09-06..09-09 (4 days): Baseline A (0 saving)
      // Days 09-10..09-12 (3 days): Baseline B (18, 27, 36 L/day)
      // Saved in window: 3 * (18, 27, 36) = (54, 81, 108) L
      // 81 < 150 (not achieved yet), but today's pace = 27 * 7 = 189 >= 150 -> "on_pace"
      const progress = goalProgress({
        goal: waterGoal,
        history: [baselineA, baselineB],
        today: '2026-09-12',
        factorsByVersion,
      });

      expect(progress.daysCounted).toBe(7);
      expect(progress.saved).toEqual({ low: 54, typical: 81, high: 108 });
      expect(progress.pace.typical).toBe(189);
      expect(progress.status).toBe('on_pace');
      expect(progress.confirmedAtCautiousEstimate).toBe(false);
    });

    it('evaluates status="getting_started" when goal start date is recent (daysCounted < N)', () => {
      // Goal started on 2026-09-10, today is 2026-09-12
      // Only 3 days (09-10, 09-11, 09-12) are on or after startDate
      // daysCounted = 3 < 7 -> "getting_started"
      const recentGoal: Goal = {
        ...waterGoal,
        startDate: '2026-09-10',
      };

      const progress = goalProgress({
        goal: recentGoal,
        history: [baselineA, baselineB],
        today: '2026-09-12',
        factorsByVersion,
      });

      expect(progress.daysCounted).toBe(3);
      expect(progress.saved).toEqual({ low: 54, typical: 81, high: 108 });
      expect(progress.status).toBe('getting_started');
    });

    it('correctly incorporates dated deviations into actual savings while pace ignores deviations', () => {
      // Window: 2026-09-10 to 2026-09-16 (7 days)
      // Deviation: shower override 0 for 2026-09-14 to 2026-09-16 (3 days)
      // Days 09-10..09-13 (4 days under Baseline B): 4 * (18, 27, 36) = (72, 108, 144) L
      // Days 09-14..09-16 (3 days away with 0 shower):
      //   Ref (60, 90, 120) - Actual (0, 0, 0) = 3 * (60, 90, 120) = (180, 270, 360) L
      // Total saved: (72 + 180, 108 + 270, 144 + 360) = (252, 378, 504) L
      // Pace: evaluated at today's baseline B habits (deviations ignored) = 27 * 7 = 189 L/week
      const awayDev: Deviation = {
        id: 'dev-away',
        startDate: '2026-09-14',
        endDate: '2026-09-16',
        field: 'showerMinutesPerDay',
        mode: 'override',
        value: 0,
      };

      const progress = goalProgress({
        goal: waterGoal,
        history: [baselineA, baselineB],
        deviations: [awayDev],
        today: '2026-09-16',
        factorsByVersion,
      });

      expect(progress.saved).toEqual({ low: 252, typical: 378, high: 504 });
      expect(progress.pace.typical).toBe(189);
      expect(progress.status).toBe('achieved');
      expect(progress.confirmedAtCautiousEstimate).toBe(true); // 252 >= 150
    });

    it('evaluates status="not_there_yet" when no habits changed', () => {
      // Baseline never changes (only baselineA)
      // Saved = 0, pace = 0 -> "not_there_yet"
      const progress = goalProgress({
        goal: waterGoal,
        history: [baselineA],
        today: '2026-09-16',
        factorsByVersion,
      });

      expect(progress.saved).toEqual({ low: 0, typical: 0, high: 0 });
      expect(progress.pace.typical).toBe(0);
      expect(progress.status).toBe('not_there_yet');
    });

    it('detects householdChanged when current baseline household size differs from snapshot', () => {
      const movedInBaseline: BaselineProfile = {
        ...baselineB,
        id: 'base-c',
        effectiveFrom: '2026-09-15',
        householdSize: 2,
      };

      const progress = goalProgress({
        goal: waterGoal,
        history: [baselineA, baselineB, movedInBaseline],
        today: '2026-09-16',
        factorsByVersion,
      });

      expect(progress.householdChanged).toBe(true);
    });

    it('handles missing factors version cleanly by recording unavailableDays', () => {
      const unknownVersionBaseline: BaselineProfile = {
        ...baselineB,
        id: 'base-unk',
        effectiveFrom: '2026-09-15',
        factorsVersion: '9.9.9', // not present in factorsByVersion
      };

      const progress = goalProgress({
        goal: waterGoal,
        history: [baselineA, baselineB, unknownVersionBaseline],
        today: '2026-09-16',
        factorsByVersion,
      });

      expect(progress.unavailableDays).toContain('2026-09-15');
      expect(progress.unavailableDays).toContain('2026-09-16');
      expect(progress.daysCounted).toBe(5);
    });

    it('returns status="unavailable" when all days are missing factor sets', () => {
      const progress = goalProgress({
        goal: waterGoal,
        history: [baselineA],
        today: '2026-09-16',
        factorsByVersion: {}, // completely empty
      });

      expect(progress.status).toBe('unavailable');
      expect(progress.daysCounted).toBe(0);
    });
  });
});
