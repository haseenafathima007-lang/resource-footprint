import { describe, it, expect } from 'vitest';
import { validateFactorSet, toFactorsMap, EngineError } from '../engine.ts';
import factorsData from '../../data/factors.v1.json';

describe('Engine: factors loader & validation', () => {
  it('successfully loads and maps valid factors payload', () => {
    const map = validateFactorSet(factorsData);
    expect(map['shower.flow']).toBeDefined();
    expect(map['shower.flow'].low).toBe(6);
    expect(map['shower.flow'].typical).toBe(9);
    expect(map['shower.flow'].high).toBe(12);

    expect(toFactorsMap(factorsData)['ac.power']).toBeDefined();
  });

  it('rejects factor set with missing or empty id', () => {
    const invalid = [
      {
        id: '', // empty id
        label: 'Flow',
        unit: 'L/min',
        low: 5,
        typical: 10,
        high: 15,
        source: 'source',
        version: '1.0.0',
        region: 'global',
      },
    ];

    expect(() => validateFactorSet(invalid)).toThrowError(EngineError);
  });

  it('rejects duplicate factor ids', () => {
    const duplicates = [
      {
        id: 'dup.factor',
        label: 'Dup 1',
        unit: 'kW',
        low: 1,
        typical: 2,
        high: 3,
        source: 's1',
        version: '1.0.0',
        region: 'global',
      },
      {
        id: 'dup.factor', // DUPLICATE
        label: 'Dup 2',
        unit: 'kW',
        low: 2,
        typical: 3,
        high: 4,
        source: 's2',
        version: '1.0.0',
        region: 'global',
      },
    ];

    expect(() => validateFactorSet(duplicates)).toThrowError(EngineError);
  });

  it('rejects range ordering violation where low > typical', () => {
    const invalid = [
      {
        id: 'flow.invalid',
        label: 'Flow',
        unit: 'L/min',
        low: 15, // low > typical
        typical: 10,
        high: 20,
        source: 'src',
        version: '1.0.0',
        region: 'global',
      },
    ];

    expect(() => validateFactorSet(invalid)).toThrowError(EngineError);
  });

  it('rejects range ordering violation where typical > high', () => {
    const invalid = [
      {
        id: 'flow.invalid',
        label: 'Flow',
        unit: 'L/min',
        low: 5,
        typical: 25, // typical > high
        high: 20,
        source: 'src',
        version: '1.0.0',
        region: 'global',
      },
    ];

    expect(() => validateFactorSet(invalid)).toThrowError(EngineError);
  });

  it('rejects negative values in factor bounds', () => {
    const invalid = [
      {
        id: 'flow.negative',
        label: 'Flow',
        unit: 'L/min',
        low: -5, // negative
        typical: 10,
        high: 20,
        source: 'src',
        version: '1.0.0',
        region: 'global',
      },
    ];

    expect(() => validateFactorSet(invalid)).toThrowError(EngineError);
  });

  it('rejects non-finite (NaN, Infinity) values in factor bounds', () => {
    const nanFactor = [
      {
        id: 'factor.nan',
        label: 'Factor',
        unit: 'kW',
        low: NaN,
        typical: 10,
        high: 20,
        source: 'src',
        version: '1.0.0',
        region: 'global',
      },
    ];
    expect(() => validateFactorSet(nanFactor)).toThrowError(EngineError);

    const infFactor = [
      {
        id: 'factor.inf',
        label: 'Factor',
        unit: 'kW',
        low: 5,
        typical: 10,
        high: Infinity,
        source: 'src',
        version: '1.0.0',
        region: 'global',
      },
    ];
    expect(() => validateFactorSet(infFactor)).toThrowError(EngineError);
  });

  it('rejects null or non-object factor set payload', () => {
    expect(() => validateFactorSet(null)).toThrowError(EngineError);
    expect(() => validateFactorSet('invalid' as any)).toThrowError(EngineError);
    expect(() => validateFactorSet({ factors: 'not-array' } as any)).toThrowError(EngineError);
  });
});
