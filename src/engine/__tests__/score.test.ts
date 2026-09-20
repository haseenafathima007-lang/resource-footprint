import { describe, it, expect } from 'vitest';
import { calculateScore } from '@/engine';

describe('Engine: calculateScore (Option 3 - Softer Bands)', () => {
  // Reference benchmark: water = 250 L/day, energy = 6 kWh/day
  // Formula:
  //   ratio = actual / reference
  //   score = clamp(100 / (1 + ratio^1.8), 0, 100)
  //   overall = (waterScore + energyScore) / 2

  it('evaluates ratio = 0.5 anchor to score 77.7', () => {
    // Hand-computed arithmetic:
    //   actualWater = 0.5 * 250 = 125 L
    //   actualEnergy = 0.5 * 6 = 3.0 kWh
    //   waterRatio = 125 / 250 = 0.5
    //   energyRatio = 3.0 / 6 = 0.5
    //   waterScore = 100 / (1 + 0.5^1.8) = 100 / (1 + 0.2871745887) = 77.689 -> 77.7
    //   energyScore = 100 / (1 + 0.5^1.8) = 77.7
    //   overall = (77.7 + 77.7) / 2 = 77.7
    const score = calculateScore({ water: 125, energy: 3 });

    expect(score.waterScore).toBe(77.7);
    expect(score.energyScore).toBe(77.7);
    expect(score.overall).toBe(77.7);
  });

  it('evaluates ratio = 1.0 anchor to score 50.0', () => {
    // Hand-computed arithmetic:
    //   actualWater = 1.0 * 250 = 250 L
    //   actualEnergy = 1.0 * 6 = 6.0 kWh
    //   waterRatio = 250 / 250 = 1.0
    //   energyRatio = 6.0 / 6 = 1.0
    //   waterScore = 100 / (1 + 1.0^1.8) = 100 / (1 + 1.0) = 50.0
    //   energyScore = 100 / (1 + 1.0^1.8) = 50.0
    //   overall = (50.0 + 50.0) / 2 = 50.0
    const score = calculateScore({ water: 250, energy: 6 });

    expect(score.waterScore).toBe(50);
    expect(score.energyScore).toBe(50);
    expect(score.overall).toBe(50);
  });

  it('evaluates ratio = 1.5 anchor to score 32.5', () => {
    // Hand-computed arithmetic:
    //   actualWater = 1.5 * 250 = 375 L
    //   actualEnergy = 1.5 * 6 = 9.0 kWh
    //   waterRatio = 375 / 250 = 1.5
    //   energyRatio = 9.0 / 6 = 1.5
    //   waterScore = 100 / (1 + 1.5^1.8) = 100 / (1 + 2.074665) = 32.52 -> 32.5
    //   energyScore = 100 / (1 + 1.5^1.8) = 32.5
    //   overall = (32.5 + 32.5) / 2 = 32.5
    const score = calculateScore({ water: 375, energy: 9 });

    expect(score.waterScore).toBe(32.5);
    expect(score.energyScore).toBe(32.5);
    expect(score.overall).toBe(32.5);
  });

  it('evaluates high consumption (ratio > 2.0) with smooth decay', () => {
    // Hand-computed arithmetic:
    //   actualWater = 500 L (ratio = 500 / 250 = 2.0) -> 100 / (1 + 2.0^1.8) = 100 / (1 + 3.48220227) = 22.31 -> 22.3
    //   actualEnergy = 15 kWh (ratio = 15 / 6 = 2.5) -> 100 / (1 + 2.5^1.8) = 100 / (1 + 5.20165) = 16.12 -> 16.1
    //   overall = (22.3 + 16.1) / 2 = 19.2
    const score = calculateScore({ water: 500, energy: 15 });

    expect(score.waterScore).toBe(22.3);
    expect(score.energyScore).toBe(16.1);
    expect(score.overall).toBe(19.2);
  });

  it('evaluates ultra-low consumption (ratio < 0.2) with high score near 95-96', () => {
    // Hand-computed arithmetic:
    //   actualWater = 50 L (ratio = 50 / 250 = 0.2) -> 100 / (1 + 0.2^1.8) = 100 / (1 + 0.05518) = 94.77 -> 94.8
    //   actualEnergy = 1 kWh (ratio = 1 / 6 = 0.166667) -> 100 / (1 + 0.166667^1.8) = 100 / (1 + 0.03964) = 96.18 -> 96.2
    //   overall = (94.8 + 96.2) / 2 = 95.5
    const score = calculateScore({ water: 50, energy: 1 });

    expect(score.waterScore).toBe(94.8);
    expect(score.energyScore).toBe(96.2);
    expect(score.overall).toBe(95.5);
  });

  it('handles zero reference values without crashing or producing NaN', () => {
    // Edge case: zero reference household inputs
    const score = calculateScore(
      { water: 100, energy: 5 },
      { water: 0, energy: 0 }
    );

    expect(Number.isFinite(score.waterScore)).toBe(true);
    expect(Number.isFinite(score.energyScore)).toBe(true);
    expect(Number.isFinite(score.overall)).toBe(true);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
  });
});
