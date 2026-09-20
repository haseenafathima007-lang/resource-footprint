import { describe, it, expect } from 'vitest';
import type { BaselineProfile } from '@/engine';
import { createDashboardModel } from './dashboardModel.ts';
import factorsData from '@/data/factors.v1.json';

// Default test profile
const defaultProfile: BaselineProfile = {
  effectiveFrom: '2026-01-01',
  factorsVersion: factorsData.version,
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: 'electric',
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: 'topLoad',
};

describe('dashboardModel - hand-computed arithmetic tests', () => {
  it('computes exact daily and monthly totals matching hand arithmetic', () => {
    /**
     * HAND COMPUTATIONS (Household size = 1):
     *
     * 1. Shower (minutes = 10, heater = 'electric'):
     *    - Flow rate factor (L/min): [6.0, 9.0, 12.0]
     *      Shower water = 10 * [6.0, 9.0, 12.0] = [60.00, 90.00, 120.00] L/day
     *    - Heating factor (kWh/L): [0.026, 0.029, 0.032]
     *      Shower energy = [60.00 * 0.026, 90.00 * 0.029, 120.00 * 0.032]
     *                    = [1.560, 2.610, 3.840] kWh/day
     *
     * 2. Cooling and Devices (AC = 4 h, Fan = 6 h, Laptop = 6 h):
     *    - AC power factor (kW): [0.90, 1.30, 1.80]
     *      AC energy = (4 / 1) * [0.90, 1.30, 1.80] = [3.600, 5.200, 7.200] kWh/day
     *    - Fan power factor (kW): [0.045, 0.060, 0.075]
     *      Fan energy = (6 / 1) * [0.045, 0.060, 0.075] = [0.270, 0.360, 0.450] kWh/day
     *    - Laptop power factor (kW): [0.030, 0.050, 0.080]
     *      Laptop energy = 6 * [0.030, 0.050, 0.080] = [0.180, 0.300, 0.480] kWh/day
     *    - Total Cooling energy:
     *      low = 3.600 + 0.270 + 0.180 = 4.050 kWh/day
     *      typical = 5.200 + 0.360 + 0.300 = 5.860 kWh/day
     *      high = 7.200 + 0.450 + 0.480 = 8.130 kWh/day
     *
     * 3. Laundry (loadsPerWeek = 4, machine = 'topLoad'):
     *    - Daily loads = 4 / 7 = 0.57142857... loads/day
     *    - Laundry water topLoad factor (L/load): [100.0, 130.0, 170.0]
     *      low = (4 / 7) * 100.0 = 57.1428... -> rounded to 57.14 L/day
     *      typical = (4 / 7) * 130.0 = 74.2857... -> rounded to 74.29 L/day
     *      high = (4 / 7) * 170.0 = 97.1428... -> rounded to 97.14 L/day
     *    - Laundry machine energy factor (kWh/load): [0.20, 0.40, 0.80]
     *      low = (4 / 7) * 0.20 = 0.11428... -> rounded to 0.114 kWh/day
     *      typical = (4 / 7) * 0.40 = 0.22857... -> rounded to 0.229 kWh/day
     *      high = (4 / 7) * 0.80 = 0.45714... -> rounded to 0.457 kWh/day
     *
     * 4. Daily Totals:
     *    - Total Water:
     *      low = 60.00 + 57.14 = 117.14 L/day
     *      typical = 90.00 + 74.29 = 164.29 L/day
     *      high = 120.00 + 97.14 = 217.14 L/day
     *    - Total Energy:
     *      low = 1.560 + 4.050 + 0.114 = 5.724 kWh/day
     *      typical = 2.610 + 5.860 + 0.229 = 8.699 kWh/day
     *      high = 3.840 + 8.130 + 0.457 = 12.427 kWh/day
     */

    const dailyModel = createDashboardModel(defaultProfile, factorsData, 'day');

    expect(dailyModel.dailyTotals.water.low).toBe(117.14);
    expect(dailyModel.dailyTotals.water.typical).toBe(164.29);
    expect(dailyModel.dailyTotals.water.high).toBe(217.14);

    expect(dailyModel.dailyTotals.energy.low).toBe(5.724);
    expect(dailyModel.dailyTotals.energy.typical).toBe(8.699);
    expect(dailyModel.dailyTotals.energy.high).toBe(12.427);

    /**
     * 5. Monthly Totals (multiplier = 30):
     *    - Monthly Water:
     *      low = 117.14 * 30 = 3514.20 L
     *      typical = 164.29 * 30 = 4928.70 L (~4,929 L)
     *      high = 217.14 * 30 = 6514.20 L
     *    - Monthly Energy:
     *      low = 5.724 * 30 = 171.720 kWh
     *      typical = 8.699 * 30 = 260.970 kWh (~261 kWh)
     *      high = 12.427 * 30 = 372.810 kWh
     */
    const monthlyModel = createDashboardModel(defaultProfile, factorsData, 'month');

    expect(monthlyModel.totals.water.low).toBe(3514.2);
    expect(monthlyModel.totals.water.typical).toBe(4928.7);
    expect(monthlyModel.totals.water.high).toBe(6514.2);

    expect(monthlyModel.totals.energy.low).toBe(171.72);
    expect(monthlyModel.totals.energy.typical).toBe(260.97);
    expect(monthlyModel.totals.energy.high).toBe(372.81);
  });

  it('computes category breakdowns matching hand arithmetic', () => {
    const dailyModel = createDashboardModel(defaultProfile, factorsData, 'day');

    const shower = dailyModel.breakdown.find((b) => b.id === 'shower')!;
    expect(shower.water.typical).toBe(90.0);
    expect(shower.energy.typical).toBe(2.61);

    const cooling = dailyModel.breakdown.find((b) => b.id === 'cooling')!;
    expect(cooling.water.typical).toBe(0);
    expect(cooling.energy.typical).toBe(5.86);

    const laundry = dailyModel.breakdown.find((b) => b.id === 'laundry')!;
    expect(laundry.water.typical).toBe(74.29);
    expect(laundry.energy.typical).toBe(0.229);
  });

  it('computes sustainability score and band matching Phase 1 formula anchors', () => {
    /**
     * Score Calculation:
     * - Reference Water = 250 L/day (reference.household.water)
     * - Reference Energy = 6.0 kWh/day (reference.household.energy)
     *
     * Option 3 (Softer Bands) math:
     * - Water ratio = 164.29 / 250 = 0.65716
     *   Water score = clamp(100 / (1 + 0.65716^1.8), 0, 100) = 68.0
     *
     * - Energy ratio = 8.699 / 6.0 = 1.449833...
     *   Energy score = clamp(100 / (1 + 1.449833^1.8), 0, 100) = 33.9
     *
     * - Hand arithmetic: (68.0 + 33.9) / 2 = 101.9 / 2 = 50.95 -> 51.0.
     * - Band (50 <= overall < 75) = 'getting-there' ('Getting there')
     */
    const model = createDashboardModel(defaultProfile, factorsData, 'month');

    expect(model.score.referenceWater).toBe(250);
    expect(model.score.referenceEnergy).toBe(6);
    expect(model.score.waterScore).toBe(68.0);
    expect(model.score.energyScore).toBe(33.9);
    expect(model.score.overall).toBe(51.0);
    expect(Math.round(model.score.overall)).toBe(51);
    expect(model.score.band).toBe('getting-there');
    expect(model.score.bandLabel).toBe('Getting there');
  });

  it('correctly reports allVerified status driven by factors', () => {
    const model = createDashboardModel(defaultProfile, factorsData, 'month');
    // In factors.v1.json, verified flags are false (unverified averages)
    expect(model.allVerified).toBe(false);

    // If factors were all verified:
    const verifiedFactors = factorsData.factors.map((f) => ({ ...f, verified: true }));
    const verifiedModel = createDashboardModel(defaultProfile, verifiedFactors, 'month');
    expect(verifiedModel.allVerified).toBe(true);
  });
});
