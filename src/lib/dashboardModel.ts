import type {
  BaselineProfile,
  Period,
  Range,
  ActivityResult,
  Factor,
  FactorSetPayload,
  FactorsMap,
} from '@/engine';
import {
  calculate,
  calculateProfile,
  calculateScore,
  scaleToPeriod,
  toFactorsMap,
  PERIOD_MULTIPLIERS,
} from '@/engine';

export type ScoreBand = 'room-to-improve' | 'getting-there' | 'great';

export interface ScoreDetails {
  overall: number; // 0 - 100
  waterScore: number; // 0 - 100
  energyScore: number; // 0 - 100
  band: ScoreBand;
  bandLabel: string;
  referenceWater: number;
  referenceEnergy: number;
}

export interface BreakdownItem {
  id: 'shower' | 'cooling' | 'laundry';
  label: string;
  water: Range; // in current period
  energy: Range; // in current period
}

export interface DashboardData {
  period: Period;
  periodMultiplier: number;
  totals: ActivityResult;
  dailyTotals: ActivityResult;
  breakdown: BreakdownItem[];
  score: ScoreDetails;
  allVerified: boolean;
}

const ZERO_RANGE: Range = { low: 0, typical: 0, high: 0 };

/**
 * Pure function that computes all metrics required by the personal dashboard.
 * Takes a baseline profile, conversion factors, and chosen period.
 * Strictly relies on engine functions and factor values. No formulas in components.
 */
export function createDashboardModel(
  baseline: BaselineProfile,
  factorsInput: FactorsMap | FactorSetPayload | Factor[],
  period: Period = 'month'
): DashboardData {
  const factors = toFactorsMap(factorsInput);

  // 1. Calculate daily personal profile totals using engine
  const dailyTotals = calculateProfile(baseline, factors);

  // 2. Scale totals to the selected period
  const totals = scaleToPeriod(dailyTotals, period);

  // 3. Compute category breakdowns
  const H = baseline.householdSize;

  // 3a. Shower
  const dailyShower = calculate(
    {
      type: 'SHOWER',
      minutesPerDay: baseline.showerMinutesPerDay,
      heater: baseline.showerHeater,
    },
    factors
  );
  const showerPeriod = scaleToPeriod(dailyShower, period);

  // 3b. Cooling & Appliances (AC and Fan divided by H; Laptop is personal)
  const acFactor = factors['ac.power'];
  const fanFactor = factors['fan.power'];
  const laptopFactor = factors['laptop.power'];

  const perCapitaAcHours = baseline.acHoursPerDay / H;
  const perCapitaFanHours = baseline.fanHoursPerDay / H;
  const personalLaptopHours = baseline.laptopHoursPerDay;

  const acLow = acFactor ? acFactor.low : 0;
  const acTyp = acFactor ? acFactor.typical : 0;
  const acHigh = acFactor ? acFactor.high : 0;

  const fanLow = fanFactor ? fanFactor.low : 0;
  const fanTyp = fanFactor ? fanFactor.typical : 0;
  const fanHigh = fanFactor ? fanFactor.high : 0;

  const laptopLow = laptopFactor ? laptopFactor.low : 0;
  const laptopTyp = laptopFactor ? laptopFactor.typical : 0;
  const laptopHigh = laptopFactor ? laptopFactor.high : 0;

  const dailyCoolingEnergy: Range = {
    low: Number((perCapitaAcHours * acLow + perCapitaFanHours * fanLow + personalLaptopHours * laptopLow).toFixed(3)),
    typical: Number((perCapitaAcHours * acTyp + perCapitaFanHours * fanTyp + personalLaptopHours * laptopTyp).toFixed(3)),
    high: Number((perCapitaAcHours * acHigh + perCapitaFanHours * fanHigh + personalLaptopHours * laptopHigh).toFixed(3)),
  };

  const dailyCoolingResult: ActivityResult = {
    water: { ...ZERO_RANGE },
    energy: dailyCoolingEnergy,
    waste: { ...ZERO_RANGE },
  };
  const coolingPeriod = scaleToPeriod(dailyCoolingResult, period);

  // 3c. Laundry (loadsPerWeek divided by H)
  const perCapitaLoadsPerWeek = baseline.laundryLoadsPerWeek / H;
  const dailyLaundry = calculate(
    {
      type: 'LAUNDRY',
      loadsPerWeek: perCapitaLoadsPerWeek,
      machine: baseline.laundryMachine,
    },
    factors
  );
  const laundryPeriod = scaleToPeriod(dailyLaundry, period);

  const breakdown: BreakdownItem[] = [
    {
      id: 'shower',
      label: 'Shower & Heating',
      water: showerPeriod.water,
      energy: showerPeriod.energy,
    },
    {
      id: 'cooling',
      label: 'Cooling & Devices',
      water: coolingPeriod.water,
      energy: coolingPeriod.energy,
    },
    {
      id: 'laundry',
      label: 'Laundry & Washing',
      water: laundryPeriod.water,
      energy: laundryPeriod.energy,
    },
  ];

  // 4. Compute Sustainability Score using reference factors from factor set
  // Exact IDs from factors.v1.json: reference.household.water and reference.household.energy
  const refWaterFactor = factors['reference.household.water'];
  const refEnergyFactor = factors['reference.household.energy'];

  const referenceWater = refWaterFactor?.typical ?? 250;
  const referenceEnergy = refEnergyFactor?.typical ?? 6;

  const scoreResult = calculateScore(
    {
      water: dailyTotals.water.typical,
      energy: dailyTotals.energy.typical,
    },
    {
      water: referenceWater,
      energy: referenceEnergy,
    }
  );

  let band: ScoreBand = 'room-to-improve';
  let bandLabel = 'Room to improve';
  if (scoreResult.overall >= 75) {
    band = 'great';
    bandLabel = 'Great';
  } else if (scoreResult.overall >= 50) {
    band = 'getting-there';
    bandLabel = 'Getting there';
  }

  // 5. Verification status across factors
  let factorList: Array<Factor & { verified?: boolean }> = [];
  if (Array.isArray(factorsInput)) {
    factorList = factorsInput as Array<Factor & { verified?: boolean }>;
  } else if ('factors' in factorsInput && Array.isArray((factorsInput as FactorSetPayload).factors)) {
    factorList = (factorsInput as FactorSetPayload).factors as Array<Factor & { verified?: boolean }>;
  } else {
    factorList = Object.values(factors) as Array<Factor & { verified?: boolean }>;
  }

  const allVerified = factorList.length > 0 && factorList.every((f) => f.verified === true);

  return {
    period,
    periodMultiplier: PERIOD_MULTIPLIERS[period],
    totals,
    dailyTotals,
    breakdown,
    score: {
      overall: scoreResult.overall,
      waterScore: scoreResult.waterScore,
      energyScore: scoreResult.energyScore,
      band,
      bandLabel,
      referenceWater,
      referenceEnergy,
    },
    allVerified,
  };
}
