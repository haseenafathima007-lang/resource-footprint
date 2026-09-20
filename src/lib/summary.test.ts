import { describe, it, expect } from "vitest";
import { generateSummary, type ScenarioHabits } from "./summary.ts";
import type { BaselineProfile, FactorSetPayload } from "@/engine";
import factorsData from "@/data/factors.v1.json";

describe("generateSummary", () => {
  const baseProfile: BaselineProfile = {
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

  it("returns neutral empty guidance when baseline and scenario are identical", () => {
    const identicalScenario: ScenarioHabits = {
      showerMinutesPerDay: 10,
      acHoursPerDay: 4,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const res = generateSummary(baseProfile, identicalScenario, factorsData, "month");
    expect(res).toBe("No habit changes selected yet. Move a slider to see your potential savings.");
  });

  it("generates correct sentence for AC reduction (dominant energy lever)", () => {
    // Reducing AC from 4 to 3 hours/day
    // Hand calculation: 1 hour * 1.3 kW typical * 30 days = 39 kWh/month
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 10,
      acHoursPerDay: 3,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const res = generateSummary(baseProfile, scenario, factorsData, "month");
    expect(res).toBe("Cutting AC by 1 hour a day could save about 39 kWh of energy a month.");
  });

  it("generates correct sentence for AC increase", () => {
    // Increasing AC from 4 to 6 hours/day (delta = +2 hours)
    // Hand calculation: 2 hours * 1.3 kW typical * 30 days = 78 kWh/month
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 10,
      acHoursPerDay: 6,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const res = generateSummary(baseProfile, scenario, factorsData, "month");
    expect(res).toBe("Increasing AC by 2 hours a day would use about 78 kWh of energy more a month.");
  });

  it("generates correct sentence for Shower reduction with water and energy", () => {
    // Reducing shower from 10 to 5 minutes (electric heater)
    // Water savings: 5 min * 9 L/min typical * 30 days = 1,350 L/month -> 2 sig figs = 1,400 L/month
    // Energy savings: 1,350 L * 0.029 kWh/L typical = 39.15 -> 2 sig figs = 39 kWh/month
    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 5,
      acHoursPerDay: 4,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const res = generateSummary(baseProfile, scenario, factorsData, "month");
    expect(res).toBe(
      "Cutting shower time by 5 minutes a day could save about 1,400 L of water and 39 kWh of energy a month."
    );
  });

  it("reads reference values dynamically from factor set rather than hardcoding", () => {
    // Under standard factor references (water: 250, energy: 6):
    // Shower -5 min: water = 1,350 L, energy = 39.15 kWh -> score = 1350/250 + 39.15/6 = 5.4 + 6.525 = 11.925
    // AC -2 hours: energy = 78 kWh -> score = 78/6 = 13.0 -> AC wins
    // But if we elevate reference.household.energy to 100 kWh/day (while water remains 250):
    // Shower score = 1350/250 + 39.15/100 = 5.4 + 0.3915 = 5.7915
    // AC score = 78/100 = 0.78
    // With dynamic reference lookup, Shower now wins because energy is de-weighted!
    const customFactors: FactorSetPayload = {
      ...factorsData,
      factors: factorsData.factors.map((f) => {
        if (f.id === "reference.household.energy") {
          return { ...f, low: 50, typical: 100, high: 150 };
        }
        return f;
      }),
    };

    const scenario: ScenarioHabits = {
      showerMinutesPerDay: 5, // -5 min shower
      acHoursPerDay: 2,       // -2 hours AC
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
    };

    const res = generateSummary(baseProfile, scenario, customFactors, "month");
    // Under customFactors, shower dominates because energy reference is large (100)
    expect(res).toContain("Cutting shower time");
  });
});
