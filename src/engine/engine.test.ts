import { describe, it, expect } from 'vitest';
import { calculate, validateProfile, PROFILE_BOUNDS } from './engine.ts';
import factorsPayload from '../data/factors.v1.json';

describe('Calculation Engine', () => {
  const factors = factorsPayload.factors;

  describe('SHOWER activity', () => {
    it('calculates water and electric heater energy', () => {
      const result = calculate(
        { type: 'SHOWER', minutesPerDay: 10, heater: 'electric' },
        factors
      );

      // 10 min * (6, 9, 12 L/min) = (60, 90, 120 L)
      expect(result.water.low).toBe(60);
      expect(result.water.typical).toBe(90);
      expect(result.water.high).toBe(120);

      // energy: 60 * 0.026 = 1.56, 90 * 0.029 = 2.61, 120 * 0.032 = 3.84
      expect(result.energy.low).toBe(1.56);
      expect(result.energy.typical).toBe(2.61);
      expect(result.energy.high).toBe(3.84);

      expect(result.waste.typical).toBe(0);
      expect(result.water.low).toBeLessThanOrEqual(result.water.typical);
      expect(result.water.typical).toBeLessThanOrEqual(result.water.high);
    });

    it('returns zero energy when heater is none', () => {
      const result = calculate(
        { type: 'SHOWER', minutesPerDay: 10, heater: 'none' },
        factors
      );

      expect(result.water.typical).toBe(90);
      expect(result.energy.low).toBe(0);
      expect(result.energy.typical).toBe(0);
      expect(result.energy.high).toBe(0);
    });

    it('handles zero shower minutes gracefully', () => {
      const result = calculate(
        { type: 'SHOWER', minutesPerDay: 0, heater: 'electric' },
        factors
      );

      expect(result.water).toEqual({ low: 0, typical: 0, high: 0 });
      expect(result.energy).toEqual({ low: 0, typical: 0, high: 0 });
      expect(result.waste).toEqual({ low: 0, typical: 0, high: 0 });
    });
  });

  describe('COOLING_APPLIANCES activity', () => {
    it('calculates energy for AC, fan, and laptop', () => {
      const result = calculate(
        {
          type: 'COOLING_APPLIANCES',
          acHoursPerDay: 4,
          fanHoursPerDay: 8,
          laptopHoursPerDay: 6,
        },
        factors
      );

      expect(result.water.typical).toBe(0);
      expect(result.energy.low).toBeGreaterThan(0);
      expect(result.energy.low).toBeLessThanOrEqual(result.energy.typical);
      expect(result.energy.typical).toBeLessThanOrEqual(result.energy.high);
    });

    it('handles zero cooling hours', () => {
      const result = calculate(
        {
          type: 'COOLING_APPLIANCES',
          acHoursPerDay: 0,
          fanHoursPerDay: 0,
          laptopHoursPerDay: 0,
        },
        factors
      );

      expect(result.water).toEqual({ low: 0, typical: 0, high: 0 });
      expect(result.energy).toEqual({ low: 0, typical: 0, high: 0 });
    });
  });

  describe('LAUNDRY activity', () => {
    it('calculates water and energy for topLoad vs frontLoad', () => {
      const topLoad = calculate(
        { type: 'LAUNDRY', loadsPerWeek: 7, machine: 'topLoad' },
        factors
      );
      const frontLoad = calculate(
        { type: 'LAUNDRY', loadsPerWeek: 7, machine: 'frontLoad' },
        factors
      );

      // 7 loads/week = 1 load/day
      expect(topLoad.water.typical).toBe(130);
      expect(frontLoad.water.typical).toBe(55);
      expect(frontLoad.water.typical).toBeLessThan(topLoad.water.typical);

      expect(topLoad.water.low).toBeLessThanOrEqual(topLoad.water.typical);
      expect(topLoad.water.typical).toBeLessThanOrEqual(topLoad.water.high);
      expect(topLoad.energy.low).toBeLessThanOrEqual(topLoad.energy.typical);
      expect(topLoad.energy.typical).toBeLessThanOrEqual(topLoad.energy.high);
    });

    it('handles zero laundry loads', () => {
      const result = calculate(
        { type: 'LAUNDRY', loadsPerWeek: 0, machine: 'frontLoad' },
        factors
      );

      expect(result.water).toEqual({ low: 0, typical: 0, high: 0 });
      expect(result.energy).toEqual({ low: 0, typical: 0, high: 0 });
    });
  });

  describe('Range ordering invariants (low <= typical <= high)', () => {
    it('maintains ordering across varied inputs', () => {
      const activities = [
        { type: 'SHOWER' as const, minutesPerDay: 25, heater: 'electric' as const },
        {
          type: 'COOLING_APPLIANCES' as const,
          acHoursPerDay: 12,
          fanHoursPerDay: 16,
          laptopHoursPerDay: 10,
        },
        { type: 'LAUNDRY' as const, loadsPerWeek: 14, machine: 'topLoad' as const },
      ];

      for (const act of activities) {
        const res = calculate(act, factors);
        expect(res.water.low).toBeLessThanOrEqual(res.water.typical);
        expect(res.water.typical).toBeLessThanOrEqual(res.water.high);
        expect(res.energy.low).toBeLessThanOrEqual(res.energy.typical);
        expect(res.energy.typical).toBeLessThanOrEqual(res.energy.high);
      }
    });
  });

  describe('PROFILE_BOUNDS and validateProfile', () => {
    it('exports defined profile bounds', () => {
      expect(PROFILE_BOUNDS.householdSize).toEqual({ min: 1, max: 20 });
      expect(PROFILE_BOUNDS.showerMinutesPerDay).toEqual({ min: 0, max: 120 });
      expect(PROFILE_BOUNDS.acHoursPerDay).toEqual({ min: 0, max: 24 });
      expect(PROFILE_BOUNDS.fanHoursPerDay).toEqual({ min: 0, max: 24 });
      expect(PROFILE_BOUNDS.laptopHoursPerDay).toEqual({ min: 0, max: 24 });
      expect(PROFILE_BOUNDS.laundryLoadsPerWeek).toEqual({ min: 0, max: 50 });
    });

    it('validates correct profile data', () => {
      const errors = validateProfile({
        householdSize: 2,
        showerMinutesPerDay: 10,
        showerHeater: 'electric',
        acHoursPerDay: 4,
        fanHoursPerDay: 8,
        laptopHoursPerDay: 6,
        laundryLoadsPerWeek: 3,
        laundryMachine: 'frontLoad',
      });
      expect(errors).toBeNull();
    });

    it('rejects out of bounds values', () => {
      const errors = validateProfile({
        householdSize: 0,
        showerMinutesPerDay: 150,
        acHoursPerDay: 25,
        fanHoursPerDay: -1,
        laptopHoursPerDay: 30,
        laundryLoadsPerWeek: 60,
        showerHeater: 'solar',
        laundryMachine: 'handwash',
      });

      expect(errors).not.toBeNull();
      expect(errors?.householdSize).toBeDefined();
      expect(errors?.showerMinutesPerDay).toBeDefined();
      expect(errors?.acHoursPerDay).toBeDefined();
      expect(errors?.fanHoursPerDay).toBeDefined();
      expect(errors?.laptopHoursPerDay).toBeDefined();
      expect(errors?.laundryLoadsPerWeek).toBeDefined();
      expect(errors?.showerHeater).toBeDefined();
      expect(errors?.laundryMachine).toBeDefined();
    });
  });
});
