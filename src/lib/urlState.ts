import type { BaselineProfile, Period } from "@/engine";
import { validateProfile } from "@/engine";
import type { ScenarioHabits } from "./summary.ts";

export interface SimulatorUrlState {
  baseline: BaselineProfile;
  scenario: ScenarioHabits;
  period: Period;
}

/**
 * Serializes baseline, scenario, and period state into a URL query parameter string.
 * Uses concise, non-identifying numeric parameter keys.
 */
export function serializeStateToQuery(
  baseline: BaselineProfile,
  scenario: ScenarioHabits,
  period: Period = "month"
): string {
  const params = new URLSearchParams();

  // Baseline
  params.set("b_h", baseline.householdSize.toString());
  params.set("b_s", baseline.showerMinutesPerDay.toString());
  params.set("b_sh", baseline.showerHeater);
  params.set("b_ac", baseline.acHoursPerDay.toString());
  params.set("b_f", baseline.fanHoursPerDay.toString());
  params.set("b_l", baseline.laptopHoursPerDay.toString());
  params.set("b_w", baseline.laundryLoadsPerWeek.toString());
  params.set("b_m", baseline.laundryMachine);

  // Scenario
  params.set("s_s", scenario.showerMinutesPerDay.toString());
  params.set("s_ac", scenario.acHoursPerDay.toString());
  params.set("s_f", scenario.fanHoursPerDay.toString());
  params.set("s_l", scenario.laptopHoursPerDay.toString());
  params.set("s_w", scenario.laundryLoadsPerWeek.toString());

  // Period
  if (period !== "month") {
    params.set("p", period);
  }

  return params.toString();
}

/**
 * Parses query parameters from the URL.
 * Validates each field through the engine; ignores invalid, malformed, or
 * out-of-bounds parameters and safely falls back to defaults.
 */
export function parseStateFromQuery(
  queryString: string,
  fallbackBaseline: BaselineProfile
): SimulatorUrlState {
  const params = new URLSearchParams(queryString);

  function parseNumericField(
    paramKey: string,
    fieldKey: keyof BaselineProfile,
    fallback: number
  ): number {
    const raw = params.get(paramKey);
    if (raw === null || raw.trim() === "") return fallback;
    const num = Number(raw);
    if (!Number.isFinite(num)) return fallback;

    const validation = validateProfile({ [fieldKey]: num });
    if (validation && validation[fieldKey]) {
      return fallback; // Out-of-bounds or invalid
    }
    return num;
  }

  // Parse baseline
  const baseline: BaselineProfile = {
    effectiveFrom: fallbackBaseline.effectiveFrom,
    factorsVersion: fallbackBaseline.factorsVersion,
    householdSize: parseNumericField("b_h", "householdSize", fallbackBaseline.householdSize),
    showerMinutesPerDay: parseNumericField("b_s", "showerMinutesPerDay", fallbackBaseline.showerMinutesPerDay),
    showerHeater: (() => {
      const h = params.get("b_sh");
      return h === "electric" || h === "none" ? h : fallbackBaseline.showerHeater;
    })(),
    acHoursPerDay: parseNumericField("b_ac", "acHoursPerDay", fallbackBaseline.acHoursPerDay),
    fanHoursPerDay: parseNumericField("b_f", "fanHoursPerDay", fallbackBaseline.fanHoursPerDay),
    laptopHoursPerDay: parseNumericField("b_l", "laptopHoursPerDay", fallbackBaseline.laptopHoursPerDay),
    laundryLoadsPerWeek: parseNumericField("b_w", "laundryLoadsPerWeek", fallbackBaseline.laundryLoadsPerWeek),
    laundryMachine: (() => {
      const m = params.get("b_m");
      return m === "topLoad" || m === "frontLoad" ? m : fallbackBaseline.laundryMachine;
    })(),
  };

  // Parse scenario
  const scenario: ScenarioHabits = {
    showerMinutesPerDay: parseNumericField("s_s", "showerMinutesPerDay", baseline.showerMinutesPerDay),
    acHoursPerDay: parseNumericField("s_ac", "acHoursPerDay", baseline.acHoursPerDay),
    fanHoursPerDay: parseNumericField("s_f", "fanHoursPerDay", baseline.fanHoursPerDay),
    laptopHoursPerDay: parseNumericField("s_l", "laptopHoursPerDay", baseline.laptopHoursPerDay),
    laundryLoadsPerWeek: parseNumericField("s_w", "laundryLoadsPerWeek", baseline.laundryLoadsPerWeek),
  };

  // Parse period
  const rawPeriod = params.get("p");
  const period: Period =
    rawPeriod === "day" || rawPeriod === "week" || rawPeriod === "month" || rawPeriod === "year"
      ? rawPeriod
      : "month";

  return { baseline, scenario, period };
}
