import { describe, it, expect } from "vitest";
import { serializeStateToQuery, parseStateFromQuery } from "./urlState.ts";
import type { BaselineProfile } from "@/engine";
import type { ScenarioHabits } from "./summary.ts";

describe("urlState: serialize and parse", () => {
  const fallbackBaseline: BaselineProfile = {
    effectiveFrom: "2026-01-01",
    factorsVersion: "1.0.0",
    householdSize: 1,
    showerMinutesPerDay: 10,
    showerHeater: "electric",
    acHoursPerDay: 4,
    fanHoursPerDay: 6,
    laptopHoursPerDay: 6,
    laundryLoadsPerWeek: 4,
    laundryMachine: "topLoad",
  };

  it("performs a clean round-trip with custom values", () => {
    const customBaseline: BaselineProfile = {
      effectiveFrom: "2026-01-01",
      factorsVersion: "1.0.0",
      householdSize: 3,
      showerMinutesPerDay: 15,
      showerHeater: "none",
      acHoursPerDay: 5,
      fanHoursPerDay: 8,
      laptopHoursPerDay: 10,
      laundryLoadsPerWeek: 6,
      laundryMachine: "frontLoad",
    };

    const customScenario: ScenarioHabits = {
      showerMinutesPerDay: 12,
      acHoursPerDay: 3,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 8,
      laundryLoadsPerWeek: 5,
    };

    const query = serializeStateToQuery(customBaseline, customScenario, "week");
    const parsed = parseStateFromQuery(query, fallbackBaseline);

    expect(parsed.baseline).toEqual(customBaseline);
    expect(parsed.scenario).toEqual(customScenario);
    expect(parsed.period).toBe("week");
  });

  it("ignores non-numeric, garbage, and invalid enum values", () => {
    const maliciousQuery =
      "b_h=large&b_s=NaN&b_sh=gas&b_m=handWash&p=century&s_ac=Infinity";
    const parsed = parseStateFromQuery(maliciousQuery, fallbackBaseline);

    // Everything falls back to default safely
    expect(parsed.baseline.householdSize).toBe(fallbackBaseline.householdSize);
    expect(parsed.baseline.showerMinutesPerDay).toBe(fallbackBaseline.showerMinutesPerDay);
    expect(parsed.baseline.showerHeater).toBe(fallbackBaseline.showerHeater);
    expect(parsed.baseline.laundryMachine).toBe(fallbackBaseline.laundryMachine);
    expect(parsed.period).toBe("month"); // fallback from invalid "century"
    expect(parsed.scenario.acHoursPerDay).toBe(fallbackBaseline.acHoursPerDay);
  });

  it("rejects out-of-bounds parameters and uses fallbacks", () => {
    // householdSize bounds: 1-20 (test 25 and 0)
    // acHours bounds: 0-24 (test 25 and -1)
    // laundryLoads bounds: 0-50 (test 100)
    const outOfBoundsQuery =
      "b_h=25&b_ac=-5&s_w=999&s_s=500";
    const parsed = parseStateFromQuery(outOfBoundsQuery, fallbackBaseline);

    expect(parsed.baseline.householdSize).toBe(fallbackBaseline.householdSize);
    expect(parsed.baseline.acHoursPerDay).toBe(fallbackBaseline.acHoursPerDay);
    expect(parsed.scenario.laundryLoadsPerWeek).toBe(fallbackBaseline.laundryLoadsPerWeek);
    expect(parsed.scenario.showerMinutesPerDay).toBe(fallbackBaseline.showerMinutesPerDay);
  });

  it("handles empty query string safely", () => {
    const parsed = parseStateFromQuery("", fallbackBaseline);
    expect(parsed.baseline).toEqual(fallbackBaseline);
    expect(parsed.scenario.acHoursPerDay).toBe(fallbackBaseline.acHoursPerDay);
    expect(parsed.period).toBe("month");
  });
});
