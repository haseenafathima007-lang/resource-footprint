import { describe, it, expect } from "vitest";
import {
  roundToSigFigs,
  roundOutward,
  formatNumber,
  formatRange,
  formatSavingsDetails,
} from "./format.ts";

describe("format: roundToSigFigs", () => {
  it("handles zero gracefully", () => {
    expect(roundToSigFigs(0)).toBe(0);
    expect(roundToSigFigs(-0)).toBe(0);
  });

  it("rounds typical habit values to 2 significant figures", () => {
    expect(roundToSigFigs(39, 2)).toBe(39);
    expect(roundToSigFigs(1.3, 2)).toBe(1.3);
    expect(roundToSigFigs(250, 2)).toBe(250);
  });

  it("handles large values correctly", () => {
    expect(roundToSigFigs(1234, 2)).toBe(1200);
    expect(roundToSigFigs(98765, 3)).toBe(98800);
  });

  it("handles tiny values (< 1) properly", () => {
    expect(roundToSigFigs(0.0456, 2)).toBe(0.046);
    expect(roundToSigFigs(0.00293, 2)).toBe(0.0029);
  });

  it("handles negative values symmetrically", () => {
    expect(roundToSigFigs(-39, 2)).toBe(-39);
    expect(roundToSigFigs(-1.3, 2)).toBe(-1.3);
    expect(roundToSigFigs(-1234, 2)).toBe(-1200);
  });
});

describe("format: roundOutward", () => {
  it("rounds lower bounds DOWN (floor) along the number line", () => {
    // 27.4 floored to 2 sig figs -> 27
    expect(roundOutward(27.4, "floor", 2)).toBe(27);
    // 1.34 floored to 2 sig figs -> 1.3
    expect(roundOutward(1.34, "floor", 2)).toBe(1.3);
    // Negative number: -15.3 floored to 2 sig figs becomes -16 (further from 0)
    expect(roundOutward(-15.3, "floor", 2)).toBe(-16);
  });

  it("rounds upper bounds UP (ceil) along the number line", () => {
    // 53.2 ceiled to 2 sig figs -> 54
    expect(roundOutward(53.2, "ceil", 2)).toBe(54);
    // 1.81 ceiled to 2 sig figs -> 1.9
    expect(roundOutward(1.81, "ceil", 2)).toBe(1.9);
    // Negative number: -15.3 ceiled to 2 sig figs becomes -15
    expect(roundOutward(-15.3, "ceil", 2)).toBe(-15);
  });

  it("handles zero outward rounding", () => {
    expect(roundOutward(0, "floor", 2)).toBe(0);
    expect(roundOutward(0, "ceil", 2)).toBe(0);
  });
});

describe("format: formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats large numbers with locale commas", () => {
    expect(formatNumber(1250)).toBe("1,250");
    expect(formatNumber(10000)).toBe("10,000");
  });

  it("formats mid-range numbers cleanly", () => {
    expect(formatNumber(39)).toBe("39");
    expect(formatNumber(12.5)).toBe("12.5");
  });

  it("formats single-digit numbers with 1 decimal", () => {
    expect(formatNumber(1.3)).toBe("1.3");
  });

  it("formats fractional values < 1", () => {
    expect(formatNumber(0.45)).toBe("0.45");
  });
});

describe("format: formatRange & formatSavingsDetails", () => {
  it("formats outward-rounded range", () => {
    // 27.2 to 53.8 -> 27 to 54
    expect(formatRange(27.2, 53.8, "kWh")).toBe("27–54 kWh");
  });

  it("formats savings details string with typical and range", () => {
    expect(formatSavingsDetails(39, 27.2, 53.8, "kWh")).toBe(
      "typically ~39, range 27–54 kWh"
    );
  });
});
