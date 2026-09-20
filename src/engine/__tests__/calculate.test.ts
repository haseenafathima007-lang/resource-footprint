import { describe, it, expect } from 'vitest';
import { calculate } from '@/engine';
import factorsData from '../../data/factors.v1.json';

describe('Engine: calculate', () => {
  const factors = factorsData.factors;

  describe('SHOWER activity', () => {
    it('computes water and electric heating energy with exact arithmetic', () => {
      // Inputs: 15 minutes/day, electric heater
      // Hand-computed arithmetic:
      // Flow rates (L/min): low=6, typical=9, high=12
      // Water:
      //   low:     15 * 6  = 90.00 L
      //   typical: 15 * 9  = 135.00 L
      //   high:    15 * 12 = 180.00 L
      // Heating rates (kWh/L): low=0.026, typical=0.029, high=0.032
      // Energy:
      //   low:     90 * 0.026  = 2.340 kWh
      //   typical: 135 * 0.029 = 3.915 kWh
      //   high:    180 * 0.032 = 5.760 kWh
      const result = calculate(
        { type: 'SHOWER', minutesPerDay: 15, heater: 'electric' },
        factors
      );

      expect(result.water.low).toBe(90);
      expect(result.water.typical).toBe(135);
      expect(result.water.high).toBe(180);

      expect(result.energy.low).toBe(2.34);
      expect(result.energy.typical).toBe(3.915);
      expect(result.energy.high).toBe(5.76);

      expect(result.waste).toEqual({ low: 0, typical: 0, high: 0 });
      expect(result.water.low).toBeLessThanOrEqual(result.water.typical);
      expect(result.water.typical).toBeLessThanOrEqual(result.water.high);
      expect(result.energy.low).toBeLessThanOrEqual(result.energy.typical);
      expect(result.energy.typical).toBeLessThanOrEqual(result.energy.high);
    });

    it('returns zero energy when heater is none', () => {
      // Inputs: 15 minutes/day, heater='none'
      // Hand-computed arithmetic:
      // Water remains identical to 15 * flow: (90, 135, 180)
      // Energy must be exactly 0 for low, typical, and high
      const result = calculate(
        { type: 'SHOWER', minutesPerDay: 15, heater: 'none' },
        factors
      );

      expect(result.water.low).toBe(90);
      expect(result.water.typical).toBe(135);
      expect(result.water.high).toBe(180);

      expect(result.energy.low).toBe(0);
      expect(result.energy.typical).toBe(0);
      expect(result.energy.high).toBe(0);
    });

    it('returns zero for all metrics on zero minutes input', () => {
      // Inputs: 0 minutes/day
      // Hand-computed arithmetic: 0 * any factor = 0
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
    it('computes combined appliance energy with exact arithmetic', () => {
      // Inputs: acHours=5, fanHours=8, laptopHours=6
      // Factors (kW):
      //   ac.power:     low=0.9,   typical=1.3,  high=1.8
      //   fan.power:    low=0.045, typical=0.06, high=0.075
      //   laptop.power: low=0.03,  typical=0.05, high=0.08
      // Hand-computed arithmetic:
      //   Energy Low:
      //     (5 * 0.9)   = 4.5
      //     (8 * 0.045) = 0.36
      //     (6 * 0.03)  = 0.18
      //     Total Low   = 4.5 + 0.36 + 0.18 = 5.040 kWh
      //   Energy Typical:
      //     (5 * 1.3)   = 6.5
      //     (8 * 0.06)  = 0.48
      //     (6 * 0.05)  = 0.30
      //     Total Typ   = 6.5 + 0.48 + 0.30 = 7.280 kWh
      //   Energy High:
      //     (5 * 1.8)   = 9.0
      //     (8 * 0.075) = 0.60
      //     (6 * 0.08)  = 0.48
      //     Total High  = 9.0 + 0.60 + 0.48 = 10.080 kWh
      const result = calculate(
        {
          type: 'COOLING_APPLIANCES',
          acHoursPerDay: 5,
          fanHoursPerDay: 8,
          laptopHoursPerDay: 6,
        },
        factors
      );

      expect(result.water).toEqual({ low: 0, typical: 0, high: 0 });
      expect(result.energy.low).toBe(5.04);
      expect(result.energy.typical).toBe(7.28);
      expect(result.energy.high).toBe(10.08);

      expect(result.energy.low).toBeLessThanOrEqual(result.energy.typical);
      expect(result.energy.typical).toBeLessThanOrEqual(result.energy.high);
    });

    it('returns zero on zero cooling and device hours', () => {
      // Inputs: 0 hours for all
      // Hand-computed: 0 * factors = 0
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
    it('computes topLoad laundry with exact arithmetic', () => {
      // Inputs: loadsPerWeek=7, machine='topLoad'
      // Daily loads = 7 / 7 = 1.0 load/day
      // Factors:
      //   laundry.water.topLoad: low=100, typical=130, high=170 L/load
      //   laundry.energy.machine: low=0.2, typical=0.4, high=0.8 kWh/load
      // Hand-computed arithmetic:
      //   Water:  1 * (100, 130, 170) = (100.00, 130.00, 170.00) L
      //   Energy: 1 * (0.2, 0.4, 0.8) = (0.200, 0.400, 0.800) kWh
      const result = calculate(
        { type: 'LAUNDRY', loadsPerWeek: 7, machine: 'topLoad' },
        factors
      );

      expect(result.water.low).toBe(100);
      expect(result.water.typical).toBe(130);
      expect(result.water.high).toBe(170);

      expect(result.energy.low).toBe(0.2);
      expect(result.energy.typical).toBe(0.4);
      expect(result.energy.high).toBe(0.8);
    });

    it('computes frontLoad laundry with exact arithmetic', () => {
      // Inputs: loadsPerWeek=14, machine='frontLoad'
      // Daily loads = 14 / 7 = 2.0 loads/day
      // Factors:
      //   laundry.water.frontLoad: low=40, typical=55, high=70 L/load
      //   laundry.energy.machine: low=0.2, typical=0.4, high=0.8 kWh/load
      // Hand-computed arithmetic:
      //   Water:  2 * (40, 55, 70) = (80.00, 110.00, 140.00) L
      //   Energy: 2 * (0.2, 0.4, 0.8) = (0.400, 0.800, 1.600) kWh
      const result = calculate(
        { type: 'LAUNDRY', loadsPerWeek: 14, machine: 'frontLoad' },
        factors
      );

      expect(result.water.low).toBe(80);
      expect(result.water.typical).toBe(110);
      expect(result.water.high).toBe(140);

      expect(result.energy.low).toBe(0.4);
      expect(result.energy.typical).toBe(0.8);
      expect(result.energy.high).toBe(1.6);
    });

    it('returns zero for zero laundry loads', () => {
      const result = calculate(
        { type: 'LAUNDRY', loadsPerWeek: 0, machine: 'frontLoad' },
        factors
      );

      expect(result.water).toEqual({ low: 0, typical: 0, high: 0 });
      expect(result.energy).toEqual({ low: 0, typical: 0, high: 0 });
    });
  });

  describe('Monotonicity Property', () => {
    it('ensures increasing any activity input never decreases water or energy', () => {
      // Shower monotonicity
      const s1 = calculate({ type: 'SHOWER', minutesPerDay: 10, heater: 'electric' }, factors);
      const s2 = calculate({ type: 'SHOWER', minutesPerDay: 15, heater: 'electric' }, factors);
      expect(s2.water.low).toBeGreaterThanOrEqual(s1.water.low);
      expect(s2.water.typical).toBeGreaterThanOrEqual(s1.water.typical);
      expect(s2.water.high).toBeGreaterThanOrEqual(s1.water.high);
      expect(s2.energy.low).toBeGreaterThanOrEqual(s1.energy.low);
      expect(s2.energy.typical).toBeGreaterThanOrEqual(s1.energy.typical);
      expect(s2.energy.high).toBeGreaterThanOrEqual(s1.energy.high);

      // AC monotonicity
      const c1 = calculate(
        { type: 'COOLING_APPLIANCES', acHoursPerDay: 2, fanHoursPerDay: 4, laptopHoursPerDay: 2 },
        factors
      );
      const c2 = calculate(
        { type: 'COOLING_APPLIANCES', acHoursPerDay: 5, fanHoursPerDay: 4, laptopHoursPerDay: 2 },
        factors
      );
      expect(c2.energy.low).toBeGreaterThanOrEqual(c1.energy.low);
      expect(c2.energy.typical).toBeGreaterThanOrEqual(c1.energy.typical);
      expect(c2.energy.high).toBeGreaterThanOrEqual(c1.energy.high);

      // Laundry monotonicity
      const l1 = calculate({ type: 'LAUNDRY', loadsPerWeek: 2, machine: 'frontLoad' }, factors);
      const l2 = calculate({ type: 'LAUNDRY', loadsPerWeek: 5, machine: 'frontLoad' }, factors);
      expect(l2.water.typical).toBeGreaterThanOrEqual(l1.water.typical);
      expect(l2.energy.typical).toBeGreaterThanOrEqual(l1.energy.typical);
    });
  });
});
