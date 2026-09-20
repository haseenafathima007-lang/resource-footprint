import { describe, it, expect } from 'vitest';
import {
  memberDailySavings,
  contributionRows,
  percentReduction,
  teamTargetProgress,
  type BaselineProfile,
  type Deviation,
  EngineError,
} from '@/engine';
import factorsData from '../../data/factors.v1.json';

describe('Engine: teams', () => {
  const factorsByVersion = {
    [factorsData.version]: factorsData,
  };

  const baselineA: BaselineProfile = {
    id: 'b-a',
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
    id: 'b-b',
    effectiveFrom: '2026-09-10',
    showerMinutesPerDay: 7, // 3 min shorter shower
  };

  describe('memberDailySavings pure calculations', () => {
    it('calculates 7-day window (2026-09-10..2026-09-16) hand-computed savings correctly', () => {
      // Hand-computed arithmetic:
      // Shower flow rate in factors.v1.json is 9 L/min typical.
      // Reducing shower by 3 min (10 min -> 7 min):
      // Water saved per day: 3 min * 9 L/min = 27 L/day
      // Energy saved per day: 3 min * 9 L/min * 4.184 * 35 / (3600 * 0.9) = 0.7831 kWh/day
      // 7 days total water: 7 * 27 L = 189 L
      // 7 days total energy: 7 * 0.783086 kWh = 5.4816 kWh -> 5.481 kWh
      // Default profile baseline daily typical: 164.2857 L/day and 8.6986 kWh/day
      // Water reduction % over 7 counted days: 189 / (164.2857 * 7) = 189 / 1150.0 = 16.43% -> 16.4%
      // Energy reduction % over 7 counted days: 5.481 / (8.6986 * 7) = 5.481 / 60.8902 = 9.00% -> 9.0%
      const res = memberDailySavings({
        snapshot: baselineA,
        history: [baselineA, baselineB],
        factorsByVersion,
        startDate: '2026-09-10',
        endDate: '2026-09-16',
      });

      expect(res.days.length).toBe(7);
      expect(res.unavailableDays).toEqual([]);

      const totalWater = res.days.reduce((acc, d) => acc + d.water, 0);
      const totalEnergy = res.days.reduce((acc, d) => acc + d.energy, 0);

      expect(totalWater).toBe(189);
      expect(Math.round(totalEnergy * 1000) / 1000).toBe(5.481);

      const waterPct = percentReduction(totalWater, 164.2857, 7);
      const energyPct = percentReduction(totalEnergy, 8.6986, 7);

      expect(Math.round(waterPct * 10) / 10).toBe(16.4);
      expect(Math.round(energyPct * 10) / 10).toBe(9.0);
    });

    it('calculates 30-day window (2026-08-18..2026-09-16) backward baseline rule and mean overall', () => {
      // 30-day window (08-18..09-16): days before 09-01 use baseline A (backward rule) and save 0.
      // Total water saved: 189 L; total energy saved: 5.481 kWh over 30 counted days.
      // Water reduction %: 189 / (164.2857 * 30) = 189 / 4928.571 = 3.83% -> 3.8%
      // Energy reduction %: 5.481 / (8.6986 * 30) = 5.481 / 260.958 = 2.10% -> 2.1%
      // Overall mean %: (3.8348 + 2.1003) / 2 = 2.967% -> 3.0%
      const res = memberDailySavings({
        snapshot: baselineA,
        history: [baselineA, baselineB],
        factorsByVersion,
        startDate: '2026-08-18',
        endDate: '2026-09-16',
      });

      expect(res.days.length).toBe(30);

      // Days 08-18..09-09 save 0 (same as snapshot)
      const earlyDays = res.days.filter(d => d.day < '2026-09-10');
      earlyDays.forEach(d => {
        expect(d.water).toBe(0);
        expect(d.energy).toBe(0);
      });

      // Days 09-10..09-16 save 27 L and 0.783 kWh/day
      const lateDays = res.days.filter(d => d.day >= '2026-09-10');
      expect(lateDays.length).toBe(7);
      lateDays.forEach(d => {
        expect(d.water).toBe(27);
      });

      const totalWater = res.days.reduce((acc, d) => acc + d.water, 0);
      const totalEnergy = res.days.reduce((acc, d) => acc + d.energy, 0);
      expect(totalWater).toBe(189);

      const waterPct = percentReduction(totalWater, 164.2857, 30);
      const energyPct = percentReduction(totalEnergy, 8.6986, 30);
      const overallPct = (waterPct + energyPct) / 2;

      expect(Math.round(waterPct * 10) / 10).toBe(3.8);
      expect(Math.round(energyPct * 10) / 10).toBe(2.1);
      expect(Math.round(overallPct * 10) / 10).toBe(3.0);

      const rows = contributionRows(res.days);
      expect(rows.length).toBe(30);
      expect(rows[0]).toHaveProperty('water_saved_l');
      expect(rows[0]).toHaveProperty('energy_saved_kwh');
    });

    it('handles negative savings when usage increases on a deviation day', () => {
      // Deviation on 2026-09-12: AC +3 hours
      const acDeviation: Deviation = {
        id: 'dev-1',
        startDate: '2026-09-12',
        endDate: '2026-09-12',
        field: 'acHoursPerDay',
        mode: 'delta' as const,
        value: 3,
        createdAt: '2026-09-12T00:00:00Z',
      };

      const res = memberDailySavings({
        snapshot: baselineA,
        history: [baselineA, baselineB],
        deviations: [acDeviation],
        factorsByVersion,
        startDate: '2026-09-10',
        endDate: '2026-09-16',
      });

      // On 09-12, AC increased by 3h -> energy saving is 0.783 - 3.9 = -3.117 kWh
      const devDay = res.days.find(d => d.day === '2026-09-12');
      expect(devDay).toBeDefined();
      expect(devDay!.energy).toBeLessThan(0);
      expect(Math.round(devDay!.energy * 1000) / 1000).toBe(-3.117);

      const totalEnergy = res.days.reduce((acc, d) => acc + d.energy, 0);
      expect(Math.round(totalEnergy * 1000) / 1000).toBe(1.581);
    });

    it('handles household division rule for shared AC reduction', () => {
      // Household 2 profile, AC reduced from 4h to 3h (-1h)
      const h2Base: BaselineProfile = {
        ...baselineA,
        householdSize: 2,
      };
      const h2Reduced: BaselineProfile = {
        ...h2Base,
        effectiveFrom: '2026-09-10',
        acHoursPerDay: 3,
      };

      const res = memberDailySavings({
        snapshot: h2Base,
        history: [h2Base, h2Reduced],
        factorsByVersion,
        startDate: '2026-09-10',
        endDate: '2026-09-10',
      });

      // AC factor is 1.3 kWh/h. Shared divided by 2 -> 1.3 / 2 = 0.65 kWh/day per person
      expect(Math.round(res.days[0].energy * 100) / 100).toBe(0.65);
    });

    it('handles missing factors version by populating unavailableDays', () => {
      const res = memberDailySavings({
        snapshot: baselineA,
        history: [baselineA, baselineB],
        factorsByVersion: {}, // Missing factors for version
        startDate: '2026-09-10',
        endDate: '2026-09-12',
      });

      expect(res.days.length).toBe(0);
      expect(res.unavailableDays).toEqual(['2026-09-10', '2026-09-11', '2026-09-12']);
    });
  });

  describe('percentReduction & teamTargetProgress edge cases', () => {
    it('throws EngineError on invalid inputs to percentReduction', () => {
      expect(() => percentReduction(100, 0, 10)).toThrow(EngineError);
      expect(() => percentReduction(100, -50, 10)).toThrow(EngineError);
      expect(() => percentReduction(100, 150, 0)).toThrow(EngineError);
    });

    it('throws EngineError on invalid inputs to teamTargetProgress', () => {
      expect(() => teamTargetProgress(100, 0)).toThrow(EngineError);
      expect(() => teamTargetProgress(100, -200)).toThrow(EngineError);
      expect(teamTargetProgress(250, 500)).toBe(0.5);
    });
  });
});
