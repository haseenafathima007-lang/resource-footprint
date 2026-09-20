import type { BaselineProfile, Period, FactorsMap, FactorSetPayload, Factor } from "@/engine";
import { compareProfiles, scaleToPeriod, toFactorsMap, EngineError } from "@/engine";
import { formatNumber, formatTypicalValue } from "./format.ts";

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
    label: "laundry frequency",
    unit: "load",
    unitPlural: "loads",
    freq: "a week",
  },
];

function getFactor(factorsMap: FactorsMap, id: string): Factor {
  const factor = factorsMap[id];
  if (!factor) {
    throw new EngineError(`Missing conversion factor: '${id}'`, "MISSING_FACTOR");
  }
  return factor;
}

/**
 * Generates a single, shareable, plain-English sentence summarizing the single
 * largest habit change between baseline and scenario.
 * Reference values for daily water and energy are read directly from the factor set (throws if missing).
 */
export function generateSummary(
  baseline: BaselineProfile,
  scenario: ScenarioHabits,
  factors: FactorsMap | FactorSetPayload | Factor[],
  period: Period = "month"
): string {
  let maxImpact = 0;
  let dominantLever: LeverMeta | null = null;
  let dominantDelta = 0;
  let dominantWater = 0;
  let dominantEnergy = 0;

  const factorsMap = toFactorsMap(factors);

  // Daily reference benchmarks for relative normalization derived strictly from factor set
  const refWaterDaily = getFactor(factorsMap, "reference.household.water").typical;
  const refEnergyDaily = getFactor(factorsMap, "reference.household.energy").typical;

  for (const lever of LEVERS) {
    const bVal = baseline[lever.key];
    const sVal = scenario[lever.key];
    const delta = sVal - bVal;

    if (Math.abs(delta) < 0.001) continue;

    // Create an isolated profile with ONLY this lever adjusted from baseline
    const isolatedProfile: BaselineProfile = {
      ...baseline,
      [lever.key]: sVal,
    };

    const diff = compareProfiles(baseline, isolatedProfile, factorsMap);
    const scaled = scaleToPeriod(diff, period);

    const waterTypical = Math.abs(scaled.water.typical);
    const energyTypical = Math.abs(scaled.energy.typical);

    // Relative impact score using standard engine normalization factors
    const impact = (waterTypical / refWaterDaily) + (energyTypical / refEnergyDaily);

    if (impact > maxImpact) {
      maxImpact = impact;
      dominantLever = lever;
      dominantDelta = delta;
      dominantWater = waterTypical;
      dominantEnergy = energyTypical;
    }
  }

  if (!dominantLever || maxImpact === 0) {
    return "No habit changes selected yet. Move a slider to see your potential savings.";
  }

  const absDelta = Math.abs(dominantDelta);
  const deltaUnitStr =
    absDelta === 1
      ? `1 ${dominantLever.unit}`
      : `${formatNumber(absDelta)} ${dominantLever.unitPlural}`;
  const periodStr =
    period === "day"
      ? "a day"
      : period === "week"
      ? "a week"
      : period === "month"
      ? "a month"
      : "a year";

  const formattedWater = formatTypicalValue(dominantWater);
  const formattedEnergy = formatTypicalValue(dominantEnergy);
  const hasWater = dominantWater > 0.05;
  const hasEnergy = dominantEnergy > 0.05;

  // Savings (reduction in consumption)
  if (dominantDelta < 0) {
    if (hasWater && hasEnergy) {
      return `Cutting ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} could save about ${formattedWater} L of water and ${formattedEnergy} kWh of energy ${periodStr}.`;
    }
    if (hasWater) {
      return `Cutting ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} could save about ${formattedWater} L of water ${periodStr}.`;
    }
    return `Cutting ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} could save about ${formattedEnergy} kWh of energy ${periodStr}.`;
  }

  // Increase in consumption
  if (hasWater && hasEnergy) {
    return `Increasing ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} would use about ${formattedWater} L of water and ${formattedEnergy} kWh of energy more ${periodStr}.`;
  }
  if (hasWater) {
    return `Increasing ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} would use about ${formattedWater} L of water more ${periodStr}.`;
  }
  return `Increasing ${dominantLever.label} by ${deltaUnitStr} ${dominantLever.freq} would use about ${formattedEnergy} kWh of energy more ${periodStr}.`;
}
