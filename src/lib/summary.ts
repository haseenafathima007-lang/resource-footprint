import type { BaselineProfile, Period, FactorsMap, FactorSetPayload, Factor } from "@/engine";
import { compareProfiles, scaleToPeriod } from "@/engine";
import { formatNumber, roundToSigFigs } from "./format.ts";

export interface ScenarioHabits {
  showerMinutesPerDay: number;
  acHoursPerDay: number;
  fanHoursPerDay: number;
  laptopHoursPerDay: number;
  laundryLoadsPerWeek: number;
}

interface LeverMeta {
  key: keyof ScenarioHabits;
  label: string;
  unit: string;
  unitPlural: string;
  freq: string;
}

const LEVERS: LeverMeta[] = [
  {
    key: "acHoursPerDay",
    label: "AC",
    unit: "hour",
    unitPlural: "hours",
    freq: "a day",
  },
  {
    key: "showerMinutesPerDay",
    label: "shower time",
    unit: "minute",
    unitPlural: "minutes",
    freq: "a day",
  },
  {
    key: "fanHoursPerDay",
    label: "fan usage",
    unit: "hour",
    unitPlural: "hours",
    freq: "a day",
  },
  {
    key: "laptopHoursPerDay",
    label: "laptop usage",
    unit: "hour",
    unitPlural: "hours",
    freq: "a day",
  },
  {
    key: "laundryLoadsPerWeek",
    label: "laundry",
    unit: "load",
    unitPlural: "loads",
    freq: "a week",
  },
];

/**
 * Generates a single, shareable, plain-English sentence summarizing the single
 * largest habit change between baseline and scenario.
 */
export function generateSummary(
  baseline: BaselineProfile,
  scenario: ScenarioHabits,
  factors: FactorsMap | FactorSetPayload | Factor[],
  period: Period = "month"
): string {
  let dominantLever: LeverMeta | null = null;
  let maxImpact = 0;
  let dominantDelta = 0;
  let dominantWater = 0;
  let dominantEnergy = 0;

  // Daily reference benchmarks for relative normalization
  const REF_WATER_DAILY = 250;
  const REF_ENERGY_DAILY = 6;

  for (const lever of LEVERS) {
    const bVal = baseline[lever.key];
    const sVal = scenario[lever.key];
    const delta = sVal - bVal;

    if (Math.abs(delta) < 1e-6) continue;

    // Isolate this lever against baseline
    const isolatedProfile: BaselineProfile = {
      ...baseline,
      [lever.key]: sVal,
    };

    const diff = compareProfiles(baseline, isolatedProfile, factors);
    const scaled = scaleToPeriod(diff, period);

    const waterTypical = Math.abs(scaled.water.typical);
    const energyTypical = Math.abs(scaled.energy.typical);

    // Relative impact score against standard reference consumption
    const impact = waterTypical / REF_WATER_DAILY + energyTypical / REF_ENERGY_DAILY;

    if (impact > maxImpact) {
      maxImpact = impact;
      dominantLever = lever;
      dominantDelta = delta;
      dominantWater = roundToSigFigs(waterTypical, 2);
      dominantEnergy = roundToSigFigs(energyTypical, 2);
    }
  }

  if (!dominantLever || maxImpact === 0) {
    return "No habit changes selected yet. Move a slider to see your potential savings.";
  }

  const absDelta = Math.abs(dominantDelta);
  const deltaUnitStr = absDelta === 1 ? `1 ${dominantLever.unit}` : `${formatNumber(absDelta)} ${dominantLever.unitPlural}`;
  const periodStr = period === "day" ? "a day" : period === "week" ? "a week" : period === "month" ? "a month" : "a year";

  // Savings (reduction in consumption)
  if (dominantDelta < 0) {
    if (dominantWater > 0 && dominantEnergy > 0) {
      return `Cutting ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} could save about ${formatNumber(dominantWater)} L of water and ${formatNumber(dominantEnergy)} kWh of energy ${periodStr}.`;
    }
    if (dominantWater > 0) {
      return `Cutting ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} could save about ${formatNumber(dominantWater)} L of water ${periodStr}.`;
    }
    return `Cutting ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} could save about ${formatNumber(dominantEnergy)} kWh of energy ${periodStr}.`;
  }

  // Increase in consumption
  if (dominantWater > 0 && dominantEnergy > 0) {
    return `Increasing ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} would use about ${formatNumber(dominantWater)} L of water and ${formatNumber(dominantEnergy)} kWh of energy more ${periodStr}.`;
  }
  if (dominantWater > 0) {
    return `Increasing ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} would use about ${formatNumber(dominantWater)} L of water more ${periodStr}.`;
  }
  return `Increasing ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} would use about ${formatNumber(dominantEnergy)} kWh of energy more ${periodStr}.`;
}
