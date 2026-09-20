import { describe, it, expect } from 'vitest';
import {
  validateProfile,
  calculate,
  calculateProfile,
  PROFILE_BOUNDS,
  EngineError,
} from '@/engine';
import factorsData from '../../data/factors.v1.json';
import type { BaselineProfile } from '../../types/profile.ts';

describe('Engine: validation & EngineError guarantees', () => {
  const factors = factorsData.factors;

  describe('PROFILE_BOUNDS boundaries', () => {
    it('accepts boundary edge values exactly on the minimum and maximum', () => {
      const minBoundProfile = {
        householdSize: PROFILE_BOUNDS.householdSize.min,
        showerMinutesPerDay: PROFILE_BOUNDS.showerMinutesPerDay.min,
        showerHeater: 'none',
        acHoursPerDay: PROFILE_BOUNDS.acHoursPerDay.min,
        fanHoursPerDay: PROFILE_BOUNDS.fanHoursPerDay.min,
        laptopHoursPerDay: PROFILE_BOUNDS.laptopHoursPerDay.min,
        laundryLoadsPerWeek: PROFILE_BOUNDS.laundryLoadsPerWeek.min,
        laundryMachine: 'topLoad',
      };

      const maxBoundProfile = {
        householdSize: PROFILE_BOUNDS.householdSize.max,
        showerMinutesPerDay: PROFILE_BOUNDS.showerMinutesPerDay.max,
        showerHeater: 'electric',
        acHoursPerDay: PROFILE_BOUNDS.acHoursPerDay.max,
        fanHoursPerDay: PROFILE_BOUNDS.fanHoursPerDay.max,
        laptopHoursPerDay: PROFILE_BOUNDS.laptopHoursPerDay.max,
        laundryLoadsPerWeek: PROFILE_BOUNDS.laundryLoadsPerWeek.max,
        laundryMachine: 'frontLoad',
      };

      expect(validateProfile(minBoundProfile)).toBeNull();
      expect(validateProfile(maxBoundProfile)).toBeNull();
    });

    it('rejects householdSize out-of-bounds, floats, NaN, and Infinity', () => {
      expect(validateProfile({ householdSize: 0 })?.householdSize).toBeDefined();
      expect(validateProfile({ householdSize: -1 })?.householdSize).toBeDefined();
      expect(validateProfile({ householdSize: 21 })?.householdSize).toBeDefined();
      expect(validateProfile({ householdSize: 2.5 })?.householdSize).toBeDefined();
      expect(validateProfile({ householdSize: NaN })?.householdSize).toBeDefined();
      expect(validateProfile({ householdSize: Infinity })?.householdSize).toBeDefined();
    });

    it('rejects showerMinutesPerDay out-of-bounds, negative, NaN, and Infinity', () => {
      expect(validateProfile({ showerMinutesPerDay: -1 })?.showerMinutesPerDay).toBeDefined();
      expect(validateProfile({ showerMinutesPerDay: 120.5 })?.showerMinutesPerDay).toBeDefined();
      expect(validateProfile({ showerMinutesPerDay: 150 })?.showerMinutesPerDay).toBeDefined();
      expect(validateProfile({ showerMinutesPerDay: NaN })?.showerMinutesPerDay).toBeDefined();
      expect(validateProfile({ showerMinutesPerDay: Infinity })?.showerMinutesPerDay).toBeDefined();
    });

    it('rejects acHoursPerDay out-of-bounds, negative, NaN, and Infinity', () => {
      expect(validateProfile({ acHoursPerDay: -0.1 })?.acHoursPerDay).toBeDefined();
      expect(validateProfile({ acHoursPerDay: 24.1 })?.acHoursPerDay).toBeDefined();
      expect(validateProfile({ acHoursPerDay: NaN })?.acHoursPerDay).toBeDefined();
      expect(validateProfile({ acHoursPerDay: Infinity })?.acHoursPerDay).toBeDefined();
    });

    it('rejects fanHoursPerDay out-of-bounds, negative, NaN, and Infinity', () => {
      expect(validateProfile({ fanHoursPerDay: -1 })?.fanHoursPerDay).toBeDefined();
      expect(validateProfile({ fanHoursPerDay: 25 })?.fanHoursPerDay).toBeDefined();
      expect(validateProfile({ fanHoursPerDay: NaN })?.fanHoursPerDay).toBeDefined();
      expect(validateProfile({ fanHoursPerDay: Infinity })?.fanHoursPerDay).toBeDefined();
    });

    it('rejects laptopHoursPerDay out-of-bounds, negative, NaN, and Infinity', () => {
      expect(validateProfile({ laptopHoursPerDay: -1 })?.laptopHoursPerDay).toBeDefined();
      expect(validateProfile({ laptopHoursPerDay: 25 })?.laptopHoursPerDay).toBeDefined();
      expect(validateProfile({ laptopHoursPerDay: NaN })?.laptopHoursPerDay).toBeDefined();
      expect(validateProfile({ laptopHoursPerDay: Infinity })?.laptopHoursPerDay).toBeDefined();
    });

    it('rejects laundryLoadsPerWeek out-of-bounds, negative, NaN, and Infinity', () => {
      expect(validateProfile({ laundryLoadsPerWeek: -1 })?.laundryLoadsPerWeek).toBeDefined();
      expect(validateProfile({ laundryLoadsPerWeek: 51 })?.laundryLoadsPerWeek).toBeDefined();
      expect(validateProfile({ laundryLoadsPerWeek: NaN })?.laundryLoadsPerWeek).toBeDefined();
      expect(validateProfile({ laundryLoadsPerWeek: Infinity })?.laundryLoadsPerWeek).toBeDefined();
    });

    it('rejects invalid heater and machine strings', () => {
      expect(validateProfile({ showerHeater: 'gas' })?.showerHeater).toBeDefined();
      expect(validateProfile({ showerHeater: '' })?.showerHeater).toBeDefined();
      expect(validateProfile({ laundryMachine: 'handwash' })?.laundryMachine).toBeDefined();
      expect(validateProfile({ laundryMachine: '' })?.laundryMachine).toBeDefined();
    });
  });

  describe('EngineError thrown by calculate', () => {
    it('throws EngineError on negative, NaN, or Infinity shower minutes', () => {
      expect(() =>
        calculate({ type: 'SHOWER', minutesPerDay: -5, heater: 'electric' }, factors)
      ).toThrowError(EngineError);

      expect(() =>
        calculate({ type: 'SHOWER', minutesPerDay: NaN, heater: 'electric' }, factors)
      ).toThrowError(EngineError);

      expect(() =>
        calculate({ type: 'SHOWER', minutesPerDay: Infinity, heater: 'electric' }, factors)
      ).toThrowError(EngineError);
    });

    it('throws EngineError on negative, NaN, or Infinity cooling hours', () => {
      expect(() =>
        calculate(
          { type: 'COOLING_APPLIANCES', acHoursPerDay: -1, fanHoursPerDay: 4, laptopHoursPerDay: 2 },
          factors
        )
      ).toThrowError(EngineError);

      expect(() =>
        calculate(
          { type: 'COOLING_APPLIANCES', acHoursPerDay: 2, fanHoursPerDay: NaN, laptopHoursPerDay: 2 },
          factors
        )
      ).toThrowError(EngineError);

      expect(() =>
        calculate(
          { type: 'COOLING_APPLIANCES', acHoursPerDay: 2, fanHoursPerDay: 4, laptopHoursPerDay: Infinity },
          factors
        )
      ).toThrowError(EngineError);
    });

    it('throws EngineError on negative, NaN, or Infinity laundry loads', () => {
      expect(() =>
        calculate({ type: 'LAUNDRY', loadsPerWeek: -2, machine: 'frontLoad' }, factors)
      ).toThrowError(EngineError);

      expect(() =>
        calculate({ type: 'LAUNDRY', loadsPerWeek: NaN, machine: 'frontLoad' }, factors)
      ).toThrowError(EngineError);

      expect(() =>
        calculate({ type: 'LAUNDRY', loadsPerWeek: Infinity, machine: 'frontLoad' }, factors)
      ).toThrowError(EngineError);
    });

    it('throws EngineError on unknown activity type or invalid activity object', () => {
      expect(() => calculate(null as any, factors)).toThrowError(EngineError);
      expect(() => calculate({ type: 'TRANSPORT' } as any, factors)).toThrowError(EngineError);
    });

    it('throws EngineError on invalid laundry machine type in calculate', () => {
      expect(() =>
        calculate({ type: 'LAUNDRY', loadsPerWeek: 3, machine: 'handwash' as any }, factors)
      ).toThrowError(EngineError);
    });

    it('throws EngineError when required conversion factors are missing', () => {
      const emptyFactors: any = {};
      // Missing shower.flow
      expect(() =>
        calculate({ type: 'SHOWER', minutesPerDay: 10, heater: 'none' }, emptyFactors)
      ).toThrowError(EngineError);

      // Missing shower.heating
      expect(() =>
        calculate(
          { type: 'SHOWER', minutesPerDay: 10, heater: 'electric' },
          { 'shower.flow': { id: 'shower.flow', low: 6, typical: 9, high: 12 } as any }
        )
      ).toThrowError(EngineError);

      // Missing cooling factors
      expect(() =>
        calculate(
          { type: 'COOLING_APPLIANCES', acHoursPerDay: 2, fanHoursPerDay: 2, laptopHoursPerDay: 2 },
          emptyFactors
        )
      ).toThrowError(EngineError);

      // Missing laundry factors
      expect(() =>
        calculate({ type: 'LAUNDRY', loadsPerWeek: 7, machine: 'topLoad' }, emptyFactors)
      ).toThrowError(EngineError);
    });
  });

  describe('EngineError thrown by calculateProfile', () => {
    it('throws EngineError when profile contains out-of-bounds values', () => {
      const invalidProfile: BaselineProfile = {
        householdSize: 0, // invalid
        showerMinutesPerDay: 10,
        showerHeater: 'none',
        acHoursPerDay: 2,
        fanHoursPerDay: 4,
        laptopHoursPerDay: 4,
        laundryLoadsPerWeek: 2,
        laundryMachine: 'topLoad',
        factorsVersion: '1.0.0',
        effectiveFrom: '2026-01-01',
      };

      expect(() => calculateProfile(invalidProfile, factors)).toThrowError(EngineError);
    });
  });
});
