import { describe, it, expect } from 'vitest';
import { calculateProfile, compareProfiles } from '@/engine';
import factorsData from '../../data/factors.v1.json';
import type { BaselineProfile } from '../../types/profile.ts';

describe('Engine: calculateProfile & compareProfiles', () => {
  const factors = factorsData.factors;

  describe('calculateProfile with householdSize division rules', () => {
    it('divides AC, fan, and laundry by householdSize, but NOT shower or laptop', () => {
      // Test profile with householdSize = 2
      // Inputs:
      //   householdSize: 2
      //   showerMinutesPerDay: 10, showerHeater: 'electric'
      //   acHoursPerDay: 4
      //   fanHoursPerDay: 8
      //   laptopHoursPerDay: 6
      //   laundryLoadsPerWeek: 7, laundryMachine: 'frontLoad'
      //
      // Hand-computed arithmetic:
      // 1. Shower (Personal - NOT divided by H=2):
      //    Water: 10 * (6, 9, 12) = (60.00, 90.00, 120.00) L
      //    Energy: (60 * 0.026, 90 * 0.029, 120 * 0.032) = (1.560, 2.610, 3.840) kWh
      //
      // 2. Cooling & Appliances (AC and Fan divided by 2; Laptop is personal):
      //    AC per capita:   4 / 2 = 2.0 hrs/day -> (2*0.9, 2*1.3, 2*1.8) = (1.800, 2.600, 3.600) kWh
      //    Fan per capita:  8 / 2 = 4.0 hrs/day -> (4*0.045, 4*0.06, 4*0.075) = (0.180, 0.240, 0.300) kWh
      //    Laptop personal: 6.0 hrs/day         -> (6*0.03, 6*0.05, 6*0.08) = (0.180, 0.300, 0.480) kWh
      //    Cooling Energy: (1.8+0.18+0.18, 2.6+0.24+0.30, 3.6+0.30+0.48) = (2.160, 3.140, 4.380) kWh
      //
      // 3. Laundry (Shared - divided by H=2):
      //    Per capita weekly loads = 7 / 2 = 3.5 loads/week
      //    Per capita daily loads  = 3.5 / 7 = 0.5 loads/day
      //    Water (frontLoad: 40, 55, 70): 0.5 * (40, 55, 70) = (20.00, 27.50, 35.00) L
      //    Energy (machine: 0.2, 0.4, 0.8): 0.5 * (0.2, 0.4, 0.8) = (0.100, 0.200, 0.400) kWh
      //
      // 4. Totals:
      //    Water:  (60 + 20, 90 + 27.5, 120 + 35) = (80.00, 117.50, 155.00) L
      //    Energy: (1.56 + 2.16 + 0.10, 2.61 + 3.14 + 0.20, 3.84 + 4.38 + 0.40)
      //            = (3.820, 5.950, 8.620) kWh
      const profile: BaselineProfile = {
        householdSize: 2,
        showerMinutesPerDay: 10,
        showerHeater: 'electric',
        acHoursPerDay: 4,
        fanHoursPerDay: 8,
        laptopHoursPerDay: 6,
        laundryLoadsPerWeek: 7,
        laundryMachine: 'frontLoad',
        factorsVersion: '1.0.0',
        effectiveFrom: '2026-01-01',
      };

      const result = calculateProfile(profile, factors);

      expect(result.water.low).toBe(80.0);
      expect(result.water.typical).toBe(117.5);
      expect(result.water.high).toBe(155.0);

      expect(result.energy.low).toBe(3.82);
      expect(result.energy.typical).toBe(5.95);
      expect(result.energy.high).toBe(8.62);

      expect(result.water.low).toBeLessThanOrEqual(result.water.typical);
      expect(result.water.typical).toBeLessThanOrEqual(result.water.high);
      expect(result.energy.low).toBeLessThanOrEqual(result.energy.typical);
      expect(result.energy.typical).toBeLessThanOrEqual(result.energy.high);
    });

    it('doubling householdSize halves AC, fan, and laundry per-capita, leaving shower and laptop constant', () => {
      const base: BaselineProfile = {
        householdSize: 1,
        showerMinutesPerDay: 10,
        showerHeater: 'none',
        acHoursPerDay: 4,
        fanHoursPerDay: 4,
        laptopHoursPerDay: 4,
        laundryLoadsPerWeek: 7,
        laundryMachine: 'topLoad',
        factorsVersion: '1.0.0',
        effectiveFrom: '2026-01-01',
      };

      const doubledHousehold: BaselineProfile = {
        ...base,
        householdSize: 2,
      };

      const res1 = calculateProfile(base, factors);
      const res2 = calculateProfile(doubledHousehold, factors);

      // Shower water is identical (10 * 9 = 90 L)
      // Base 1 laundry water = 130 L -> Total typical water = 90 + 130 = 220 L
      // Base 2 laundry water = 130 / 2 = 65 L -> Total typical water = 90 + 65 = 155 L
      expect(res1.water.typical).toBe(220);
      expect(res2.water.typical).toBe(155);
      expect(res2.water.typical).toBeLessThan(res1.water.typical);
    });
  });

  describe('compareProfiles', () => {
    const baseline: BaselineProfile = {
      householdSize: 1,
      showerMinutesPerDay: 10,
      showerHeater: 'electric',
      acHoursPerDay: 4,
      fanHoursPerDay: 8,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 7,
      laundryMachine: 'frontLoad',
      factorsVersion: '1.0.0',
      effectiveFrom: '2026-01-01',
    };

    it('returns zero savings when comparing identical profiles', () => {
      const savings = compareProfiles(baseline, baseline, factors);
      expect(savings.water).toEqual({ low: 0, typical: 0, high: 0 });
      expect(savings.energy).toEqual({ low: 0, typical: 0, high: 0 });
    });

    it('returns positive savings when reducing consumption', () => {
      // Before: 10 min shower. After: 5 min shower. (Cut by 5 min)
      // Water saved: 5 min * (6, 9, 12) = (30, 45, 60) L
      // Energy saved from heater:
      //   low: 30 * 0.026 = 0.78 kWh
      //   typ: 45 * 0.029 = 1.305 kWh
      //   high: 60 * 0.032 = 1.92 kWh
      const reduced: BaselineProfile = {
        ...baseline,
        showerMinutesPerDay: 5,
      };

      const savings = compareProfiles(baseline, reduced, factors);

      expect(savings.water.typical).toBe(45);
      expect(savings.water.low).toBe(30);
      expect(savings.water.high).toBe(60);

      expect(savings.energy.typical).toBe(1.305);
      expect(savings.energy.low).toBe(0.78);
      expect(savings.energy.high).toBe(1.92);

      // Positive savings
      expect(savings.water.typical).toBeGreaterThan(0);
      expect(savings.energy.typical).toBeGreaterThan(0);

      // Ordering preserved
      expect(savings.water.low).toBeLessThanOrEqual(savings.water.typical);
      expect(savings.water.typical).toBeLessThanOrEqual(savings.water.high);
      expect(savings.energy.low).toBeLessThanOrEqual(savings.energy.typical);
      expect(savings.energy.typical).toBeLessThanOrEqual(savings.energy.high);
    });

    it('returns negative savings when increasing consumption while preserving low <= typical <= high', () => {
      // Before: 10 min shower. After: 15 min shower.
      const increased: BaselineProfile = {
        ...baseline,
        showerMinutesPerDay: 15,
      };

      const savings = compareProfiles(baseline, increased, factors);

      // Typical savings must be negative (-45 L)
      expect(savings.water.typical).toBe(-45);
      expect(savings.energy.typical).toBe(-1.305);

      // Ordering MUST be preserved: low <= typical <= high
      expect(savings.water.low).toBe(-60);
      expect(savings.water.typical).toBe(-45);
      expect(savings.water.high).toBe(-30);
      expect(savings.water.low).toBeLessThanOrEqual(savings.water.typical);
      expect(savings.water.typical).toBeLessThanOrEqual(savings.water.high);

      expect(savings.energy.low).toBe(-1.92);
      expect(savings.energy.typical).toBe(-1.305);
      expect(savings.energy.high).toBe(-0.78);
      expect(savings.energy.low).toBeLessThanOrEqual(savings.energy.typical);
      expect(savings.energy.typical).toBeLessThanOrEqual(savings.energy.high);
    });
  });

  describe('Range ordering invariant (seeded pseudo-random generator)', () => {
    it('maintains low <= typical <= high across 50 randomized valid profiles', () => {
      // Seeded Linear Congruential Generator (LCG) for deterministic reproducibility
      let seed = 42;
      function nextRand(): number {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      }

      for (let i = 0; i < 50; i++) {
        const randProfile: BaselineProfile = {
          householdSize: Math.floor(nextRand() * 10) + 1, // 1 - 10
          showerMinutesPerDay: Math.floor(nextRand() * 60), // 0 - 60
          showerHeater: nextRand() > 0.5 ? 'electric' : 'none',
          acHoursPerDay: Math.floor(nextRand() * 16), // 0 - 16
          fanHoursPerDay: Math.floor(nextRand() * 16),
          laptopHoursPerDay: Math.floor(nextRand() * 12),
          laundryLoadsPerWeek: Math.floor(nextRand() * 20),
          laundryMachine: nextRand() > 0.5 ? 'frontLoad' : 'topLoad',
          factorsVersion: '1.0.0',
          effectiveFrom: '2026-01-01',
        };

        const res = calculateProfile(randProfile, factors);

        expect(res.water.low).toBeLessThanOrEqual(res.water.typical);
        expect(res.water.typical).toBeLessThanOrEqual(res.water.high);
        expect(res.energy.low).toBeLessThanOrEqual(res.energy.typical);
        expect(res.energy.typical).toBeLessThanOrEqual(res.energy.high);
      }
    });
  });
});
