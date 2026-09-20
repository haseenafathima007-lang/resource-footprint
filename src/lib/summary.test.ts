import { describe, it, expect } from "vitest";
import { generateSummary, type ScenarioHabits } from "./summary.ts";
import type { BaselineProfile } from "@/engine";
import factorsData from "../data/factors.v1.json";

describe("summary: generateSummary", () => {
  const factors = factorsData.factors;

  const defaultBaseline: BaselineProfile = {
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

  it("handles no change with friendly empty guidance", () => {
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 10,
      acHoursPerDay: 4,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const text = generateSummary(defaultBaseline, scenario, factors, "month");
    expect(text).toBe(
      "No habit changes selected yet. Move a slider to see your potential savings."
    );
  });

  it("summarizes a single habit reduction with exact hand-calculated values", () => {
    // Hand calculation:
    // Baseline AC = 4 h, Scenario AC = 3 h (delta = -1 h)
    // ac.power typical = 1.3 kW
    // Daily energy reduction = 1 h * 1.3 kW / 1 (householdSize) = 1.3 kWh/day
    // Monthly energy reduction = 1.3 * 30 = 39.0 kWh/month
    // Water reduction = 0 L
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 10,
      acHoursPerDay: 3,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const text = generateSummary(defaultBaseline, scenario, factors, "month");
    expect(text).toBe(
      "Cutting AC by 1 hour a day could save about 39 kWh of energy a month."
    );
  });

  it("summarizes an increase in habit consumption neutrally", () => {
    // Hand calculation:
    // Baseline AC = 4 h, Scenario AC = 6 h (delta = +2 h)
    // ac.power typical = 1.3 kW
    // Daily energy increase = 2 h * 1.3 kW / 1 = 2.6 kWh/day
    // Monthly energy increase = 2.6 * 30 = 78.0 kWh/month
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 10,
      acHoursPerDay: 6,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const text = generateSummary(defaultBaseline, scenario, factors, "month");
    expect(text).toBe(
      "Increasing AC by 2 hours a day would use about 78 kWh of energy more a month."
    );
  });

  it("picks the single largest change when multiple levers are altered", () => {
    // Hand calculation:
    // Lever 1: fan hours reduced from 6 to 4 (delta = -2 h)
    //   fan.power typical = 0.06 kW -> daily = 2 * 0.06 = 0.12 kWh/day
    //   monthly = 0.12 * 30 = 3.6 kWh/month (relative score ~ 3.6 / 6 = 0.6)
    // Lever 2: AC hours reduced from 4 to 2 (delta = -2 h)
    //   ac.power typical = 1.3 kW -> daily = 2 * 1.3 = 2.6 kWh/day
    //   monthly = 2.6 * 30 = 78 kWh/month (relative score ~ 78 / 6 = 13.0)
    // Dominant lever: AC (-2 h saving 78 kWh/month)
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 10,
      acHoursPerDay: 2,
      fanHoursPerDay: 4,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const text = generateSummary(defaultBaseline, scenario, factors, "month");
    expect(text).toBe(
      "Cutting AC by 2 hours a day could save about 78 kWh of energy a month."
    );
  });

  it("handles dual water and energy reductions properly", () => {
    // Hand calculation for shower with electric geyser:
    // Baseline shower = 10 min, Scenario = 5 min (delta = -5 min)
    // shower.flow typical = 9 L/min -> water reduction = 5 * 9 = 45 L/day
    // Monthly water = 45 * 30 = 1350 L -> rounded to 2 sig figs = 1400 L/month
    // shower.heating typical = 0.029 kWh/L -> energy = 45 * 0.029 = 1.305 kWh/day
    // Monthly energy = 1.305 * 30 = 39.15 kWh -> rounded to 2 sig figs = 39 kWh/month
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 5,
      acHoursPerDay: 4,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const text = generateSummary(defaultBaseline, scenario, factors, "month");
    expect(text).toBe(
      "Cutting shower time by 5 minutes a day could save about 1,400 L of water and 39 kWh of energy a month."
    );
  });
});
