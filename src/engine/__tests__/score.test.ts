import { describe, it, expect } from 'vitest';
import { calculateScore } from '@/engine';

describe('Engine: calculateScore', () => {
  // Reference benchmark: water = 250 L/day, energy = 6 kWh/day
  // Formula:
  //   ratio = actual / reference
  //   score = clamp(100 - (ratio - 0.5) * 100, 0, 100)
  //   overall = (waterScore + energyScore) / 2

  it('evaluates ratio = 0.5 anchor to score 100', () => {
    // Hand-computed arithmetic:
    //   actualWater = 0.5 * 250 = 125 L
    //   actualEnergy = 0.5 * 6 = 3.0 kWh
    //   waterRatio = 125 / 250 = 0.5
    //   energyRatio = 3.0 / 6 = 0.5
    //   waterScore = 100 - (0.5 - 0.5) * 100 = 100 - 0 = 100
    //   energyScore = 100 - (0.5 - 0.5) * 100 = 100 - 0 = 100
    //   overall = (100 + 100) / 2 = 100
    const score = calculateScore({ water: 125, energy: 3 });

    expect(score.waterScore).toBe(100);
    expect(score.energyScore).toBe(100);
    expect(score.overall).toBe(100);
  });

  it('evaluates ratio = 1.0 anchor to score 50', () => {
    // Hand-computed arithmetic:
    //   actualWater = 1.0 * 250 = 250 L
    //   actualEnergy = 1.0 * 6 = 6.0 kWh
    //   waterRatio = 250 / 250 = 1.0
    //   energyRatio = 6.0 / 6 = 1.0
    //   waterScore = 100 - (1.0 - 0.5) * 100 = 100 - 50 = 50
    //   energyScore = 100 - (1.0 - 0.5) * 100 = 100 - 50 = 50
    //   overall = (50 + 50) / 2 = 50
    const score = calculateScore({ water: 250, energy: 6 });

    expect(score.waterScore).toBe(50);
    expect(score.energyScore).toBe(50);
    expect(score.overall).toBe(50);
  });

  it('evaluates ratio = 1.5 anchor to score 0', () => {
    // Hand-computed arithmetic:
    //   actualWater = 1.5 * 250 = 375 L
    //   actualEnergy = 1.5 * 6 = 9.0 kWh
    //   waterRatio = 375 / 250 = 1.5
    //   energyRatio = 9.0 / 6 = 1.5
    //   waterScore = 100 - (1.5 - 0.5) * 100 = 100 - 100 = 0
    //   energyScore = 100 - (1.5 - 0.5) * 100 = 100 - 100 = 0
    //   overall = (0 + 0) / 2 = 0
    const score = calculateScore({ water: 375, energy: 9 });

    expect(score.waterScore).toBe(0);
    expect(score.energyScore).toBe(0);
    expect(score.overall).toBe(0);
  });

  it('clamps excessive consumption (ratio > 1.5) to 0', () => {
    // Hand-computed arithmetic:
    //   actualWater = 500 L (ratio = 500 / 250 = 2.0)
    //   actualEnergy = 15 kWh (ratio = 15 / 6 = 2.5)
    //   raw water score = 100 - (2.0 - 0.5) * 100 = -50 -> clamped to 0
    //   raw energy score = 100 - (2.5 - 0.5) * 100 = -100 -> clamped to 0
    const score = calculateScore({ water: 500, energy: 15 });

    expect(score.waterScore).toBe(0);
    expect(score.energyScore).toBe(0);
    expect(score.overall).toBe(0);
  });

  it('clamps ultra-low consumption (ratio < 0.5) to 100', () => {
    // Hand-computed arithmetic:
    //   actualWater = 50 L (ratio = 50 / 250 = 0.2)
    //   actualEnergy = 1 kWh (ratio = 1 / 6 = 0.167)
    //   raw water score = 100 - (0.2 - 0.5) * 100 = 130 -> clamped to 100
    //   raw energy score = 100 - (0.167 - 0.5) * 100 = 133.3 -> clamped to 100
    const score = calculateScore({ water: 50, energy: 1 });

    expect(score.waterScore).toBe(100);
    expect(score.energyScore).toBe(100);
    expect(score.overall).toBe(100);
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
