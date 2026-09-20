import { describe, it, expect } from 'vitest';
import {
  suggest,
  coverageOfGoal,
  validateSuggestionRules,
  type BaselineProfile,
  EngineError,
} from '@/engine';
import factorsData from '../../data/factors.v1.json';
import suggestionsData from '../../data/suggestions.v1.json';

describe('Engine: suggestions', () => {
  const factors = factorsData.factors;

  const defaultProfile: BaselineProfile = {
    id: 'test-default',
    userId: 'user-1',
    effectiveFrom: '2026-01-01',
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

  describe('Rule validation & loader', () => {
    it('validates bundled suggestions file successfully', () => {
      const validated = validateSuggestionRules(suggestionsData);
      expect(validated.version).toBe('1.0.0');
      expect(validated.rules.length).toBe(6);
      expect(validated.minImpact).toBe(0.01);
    });

    it('rejects invalid suggestions payload with missing or bad fields', () => {
      expect(() => validateSuggestionRules(null)).toThrowError(EngineError);
      expect(() => validateSuggestionRules({ version: '1.0.0', rules: 'not-array' })).toThrowError(EngineError);
      expect(() =>
        validateSuggestionRules({
          version: '1.0.0',
          rules: [{ id: 'bad', activity: 'invalid_act', kind: 'habit' }],
        })
      ).toThrowError(EngineError);
      expect(() =>
        validateSuggestionRules({
          version: '1.0.0',
          rules: [{ id: 'bad', activity: 'shower', kind: 'habit', field: 'showerMinutesPerDay', step: -1, floor: 0 }],
        })
      ).toThrowError(EngineError);
      expect(() =>
        validateSuggestionRules({
          version: '1.0.0',
          rules: [
            { id: 'dup', activity: 'shower', kind: 'habit', field: 'showerMinutesPerDay', step: 1, floor: 0 },
            { id: 'dup', activity: 'shower', kind: 'habit', field: 'showerMinutesPerDay', step: 2, floor: 0 },
          ],
        })
      ).toThrowError(EngineError);
    });
  });

  describe('Hand-computed arithmetic & ranking on default profile', () => {
    it('computes exact savings and rankings for default single-person profile', () => {
      // Inputs: H=1, Shower 10m electric, AC 4h, Fan 6h, Laptop 6h, Laundry 4/wk topLoad
      // Reference: Water 250 L/day, Energy 6 kWh/day
      //
      // 1. shower.shorter (10 -> 7 min):
      //    Water saving: 3 * (6, 9, 12) = (18, 27, 36) L/day
      //    Week water: 7 * (18, 27, 36) = (126, 189, 252) L
      //    Month water: 30 * (18, 27, 36) = (540, 810, 1080) L
      //    Energy saving: water * (0.026, 0.029, 0.032) = (18*0.026, 27*0.029, 36*0.032) = (0.468, 0.783, 1.152) kWh/day
      //    Week energy: 7 * (0.468, 0.783, 1.152) = (3.276, 5.481, 8.064) kWh
      //    Month energy: 30 * (0.468, 0.783, 1.152) = (14.04, 23.49, 34.56) kWh
      //    Impact: (27 / 250) + (0.783 / 6) = 0.108 + 0.1305 = 0.2385
      //
      // 2. ac.less (4 -> 3 h):
      //    Energy saving: 1 * (0.9, 1.3, 1.8) = (0.9, 1.3, 1.8) kWh/day
      //    Week energy: (6.3, 9.1, 12.6) kWh
      //    Month energy: (27, 39, 54) kWh
      //    Water: 0
      //    Impact: 0 + (1.3 / 6) = 0.216666...
      //
      // 3. laundry.frontLoad (4 loads/week, switch topLoad -> frontLoad):
      //    Water saving per load: (100-40, 130-55, 170-70) = (60, 75, 100) L/load
      //    Week water: 4 * (60, 75, 100) = (240, 300, 400) L
      //    Day water: (240/7, 300/7, 400/7) = (34.286, 42.857, 57.143) L/day
      //    Month water: (300/7)*30 = 1285.714 L
      //    Energy: 0 (same machine factor 0.4)
      //    Impact: (42.8571 / 250) + 0 = 0.171428...
      //
      // Diversity rule with limit 3 yields: [shower.shorter, ac.less, laundry.frontLoad]
      const results = suggest(defaultProfile, factors, suggestionsData, { limit: 3 });

      expect(results.length).toBe(3);

      // #1: Shower
      const showerSug = results[0];
      expect(showerSug.ruleId).toBe('shower.shorter');
      expect(showerSug.activity).toBe('shower');
      expect(showerSug.from).toBe(10);
      expect(showerSug.to).toBe(7);
      expect(showerSug.savings.day.water).toEqual({ low: 18, typical: 27, high: 36 });
      expect(showerSug.savings.day.energy).toEqual({ low: 0.468, typical: 0.783, high: 1.152 });
      expect(showerSug.savings.week.water).toEqual({ low: 126, typical: 189, high: 252 });
      expect(showerSug.savings.week.energy).toEqual({ low: 3.276, typical: 5.481, high: 8.064 });
      expect(showerSug.savings.month.water).toEqual({ low: 540, typical: 810, high: 1080 });
      expect(showerSug.savings.month.energy).toEqual({ low: 14.04, typical: 23.49, high: 34.56 });
      expect(showerSug.impact).toBeCloseTo(0.2385, 4);

      // #2: AC
      const acSug = results[1];
      expect(acSug.ruleId).toBe('ac.less');
      expect(acSug.activity).toBe('cooling');
      expect(acSug.from).toBe(4);
      expect(acSug.to).toBe(3);
      expect(acSug.savings.day.water).toEqual({ low: 0, typical: 0, high: 0 });
      expect(acSug.savings.day.energy).toEqual({ low: 0.9, typical: 1.3, high: 1.8 });
      expect(acSug.savings.week.energy).toEqual({ low: 6.3, typical: 9.1, high: 12.6 });
      expect(acSug.savings.month.energy).toEqual({ low: 27, typical: 39, high: 54 });
      expect(acSug.impact).toBeCloseTo(0.2167, 3);

      // #3: Front Load
      const frontLoadSug = results[2];
      expect(frontLoadSug.ruleId).toBe('laundry.frontLoad');
      expect(frontLoadSug.activity).toBe('laundry');
      expect(frontLoadSug.from).toBe('topLoad');
      expect(frontLoadSug.to).toBe('frontLoad');
      expect(frontLoadSug.savings.week.water).toEqual({ low: 239.96, typical: 300.02, high: 399.98 });
      expect(frontLoadSug.savings.day.water.typical).toBeCloseTo(42.86, 2);
      expect(frontLoadSug.savings.month.water.typical).toBeCloseTo(1285.80, 1);
      expect(frontLoadSug.impact).toBeCloseTo(0.1714, 3);
    });

    it('filters out low impact suggestions (laptop under minImpact 0.01)', () => {
      // Laptop 6 -> 5 saves 0.05 kWh/day -> 0.05 / 6 = 0.00833 impact < 0.01
      const allSuggestions = suggest(defaultProfile, factors, suggestionsData, { limit: 10 });
      const laptopRule = allSuggestions.find((s) => s.ruleId === 'laptop.less');
      expect(laptopRule).toBeUndefined();
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('does not suggest shower when already at floor (4 min)', () => {
      const lowShowerProfile: BaselineProfile = {
        ...defaultProfile,
        showerMinutesPerDay: 4,
      };
      const results = suggest(lowShowerProfile, factors);
      expect(results.find((s) => s.ruleId === 'shower.shorter')).toBeUndefined();
    });

    it('clamps to floor when current value is close to floor (5 min -> 4 min)', () => {
      const fiveMinProfile: BaselineProfile = {
        ...defaultProfile,
        showerMinutesPerDay: 5,
      };
      const results = suggest(fiveMinProfile, factors);
      const showerSug = results.find((s) => s.ruleId === 'shower.shorter');
      expect(showerSug).toBeDefined();
      expect(showerSug?.from).toBe(5);
      expect(showerSug?.to).toBe(4); // stepped 1 down to floor instead of 3
    });

    it('does not suggest equipment switch when already frontLoad', () => {
      const frontLoadProfile: BaselineProfile = {
        ...defaultProfile,
        laundryMachine: 'frontLoad',
      };
      const results = suggest(frontLoadProfile, factors);
      expect(results.find((s) => s.ruleId === 'laundry.frontLoad')).toBeUndefined();
      // Should now pick laundry.fewer for laundry activity
      const laundrySug = results.find((s) => s.activity === 'laundry');
      expect(laundrySug?.ruleId).toBe('laundry.fewer');
    });

    it('halves shared cooling and laundry savings for household size 2', () => {
      const multiHouseholdProfile: BaselineProfile = {
        ...defaultProfile,
        householdSize: 2,
      };
      const results = suggest(multiHouseholdProfile, factors, suggestionsData, { limit: 3 });

      // Shower is personal -> unchanged (27 L/day)
      const shower = results.find((s) => s.ruleId === 'shower.shorter')!;
      expect(shower.savings.day.water.typical).toBe(27);

      // AC is shared -> halved (1.3 / 2 = 0.65 kWh/day)
      const ac = results.find((s) => s.ruleId === 'ac.less')!;
      expect(ac.savings.day.energy.typical).toBe(0.65);

      // Laundry frontLoad is shared -> halved (300.02 / 2 = 150.01 L/week)
      const frontLoad = results.find((s) => s.ruleId === 'laundry.frontLoad')!;
      expect(frontLoad.savings.week.water.typical).toBe(150.01);
    });
  });

  describe('coverageOfGoal', () => {
    it('computes coverage ratio against weekly and monthly targets', () => {
      const results = suggest(defaultProfile, factors, suggestionsData, { limit: 1 });
      const showerSug = results[0]; // shower.shorter saves 189 L/week typical

      // Goal: 300 L / week
      const coverage300 = coverageOfGoal(showerSug, {
        resource: 'water',
        period: 'week',
        targetAmount: 300,
      });
      // 189 / 300 = 0.63
      expect(coverage300).toBeCloseTo(0.63, 2);

      // Goal: 150 L / week -> 189 / 150 = 1.26 (exceeds 100%)
      const coverage150 = coverageOfGoal(showerSug, {
        resource: 'water',
        period: 'week',
        targetAmount: 150,
      });
      expect(coverage150).toBeCloseTo(1.26, 2);

      // Goal target 0
      expect(coverageOfGoal(showerSug, { resource: 'water', period: 'week', targetAmount: 0 })).toBe(0);
    });

    it('throws EngineError when reference factors are missing', () => {
      expect(() => suggest(defaultProfile, {})).toThrowError(EngineError);
    });

    it('handles custom rules array without file payload wrapper', () => {
      const customRules = [suggestionsData.rules[0]]; // shower rule
      const results = suggest(defaultProfile, factors, customRules as any);
      expect(results.length).toBe(1);
      expect(results[0].ruleId).toBe('shower.shorter');
    });
  });
});
