import { describe, it, expect } from "vitest";
import {
  roundToSigFigs,
  roundOutward,
  formatNumber,
  formatRange,
  formatSavingsDetails,
  formatTypicalValue,
} from "./format.ts";

describe("format utilities", () => {
  describe("roundToSigFigs", () => {
    it("handles zero and edge numbers correctly", () => {
      expect(roundToSigFigs(0)).toBe(0);
      expect(roundToSigFigs(NaN)).toBe(0);
      expect(roundToSigFigs(Infinity)).toBe(0);
    });

    it("rounds numbers with 2 significant figures", () => {
      expect(roundToSigFigs(1234, 2)).toBe(1200);
      expect(roundToSigFigs(27.4, 2)).toBe(27);
      expect(roundToSigFigs(0.0456, 2)).toBe(0.046);
      expect(roundToSigFigs(5.19, 2)).toBe(5.2);
    });
  });

  describe("roundOutward", () => {
    it("floors lower bound outward", () => {
      // 27.4 -> 27
      expect(roundOutward(27.4, "floor", 2)).toBe(27);
      // -15.3 -> -16
      expect(roundOutward(-15.3, "floor", 2)).toBe(-16);
    });

    it("ceils upper bound outward", () => {
      // 53.2 -> 54
      expect(roundOutward(53.2, "ceil", 2)).toBe(54);
      // -15.3 -> -15
      expect(roundOutward(-15.3, "ceil", 2)).toBe(-15);
    });
  });

  describe("formatNumber", () => {
    it("formats thousands with commas", () => {
      expect(formatNumber(1250)).toBe("1,250");
      expect(formatNumber(10000)).toBe("10,000");
    });

    it("formats intermediate numbers cleanly", () => {
      expect(formatNumber(39)).toBe("39");
      expect(formatNumber(39.0)).toBe("39");
      expect(formatNumber(39.4)).toBe("39.4");
      expect(formatNumber(1.3)).toBe("1.3");
    });

    it("formats zero", () => {
      expect(formatNumber(0)).toBe("0");
    });
  });

  describe("formatTypicalValue", () => {
    it("rounds and formats typical numbers consistently", () => {
      expect(formatTypicalValue(39)).toBe("39");
      expect(formatTypicalValue(1.3)).toBe("1.3");
      expect(formatTypicalValue(5.19)).toBe("5.2");
      expect(formatTypicalValue(2700)).toBe("2,700");
      expect(formatTypicalValue(-39)).toBe("39");
    });
  });

  describe("formatRange", () => {
    it("outward rounds and joins ranges with an en-dash", () => {
      const res = formatRange(27.1, 53.8, "kWh");
      expect(res).toBe("27–54 kWh");
    });

    it("works without unit suffix", () => {
      const res = formatRange(10.2, 20.9);
      expect(res).toBe("10–21");
    });
  });

  describe("formatSavingsDetails", () => {
    it("combines typical and range", () => {
      const res = formatSavingsDetails(39.2, 27.1, 53.8, "kWh");
      expect(res).toBe("typically ~39, range 27–54 kWh");
    });
  });
});
