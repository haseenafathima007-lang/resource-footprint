import type { Factor, FactorSetPayload, FactorsMap } from './types.ts';
import { EngineError } from './validation.ts';

/**
 * Validates a factor set payload or array.
 * Rejects missing ids, duplicates, low > typical or typical > high, negative and non-finite values.
 */
export function validateFactorSet(payload: unknown): FactorsMap {
  if (!payload || typeof payload !== 'object') {
    throw new EngineError('Factor set payload must be a non-null object', 'INVALID_FACTOR_SET');
  }

  let factorsList: Factor[];
  if ('factors' in payload && Array.isArray((payload as FactorSetPayload).factors)) {
    factorsList = (payload as FactorSetPayload).factors;
  } else if (Array.isArray(payload)) {
    factorsList = payload as Factor[];
  } else {
    throw new EngineError('Factor set missing valid factors array', 'INVALID_FACTOR_SET');
  }

  const map: FactorsMap = {};
  const seenIds = new Set<string>();

  for (let i = 0; i < factorsList.length; i++) {
    const f = factorsList[i];
    if (!f || typeof f !== 'object') {
      throw new EngineError(`Factor at index ${i} is not an object`, 'INVALID_FACTOR');
    }
    if (!f.id || typeof f.id !== 'string' || f.id.trim() === '') {
      throw new EngineError(`Factor at index ${i} has missing or empty id`, 'MISSING_FACTOR_ID');
    }
    if (seenIds.has(f.id)) {
      throw new EngineError(`Duplicate factor id detected: '${f.id}'`, 'DUPLICATE_FACTOR_ID');
    }
    seenIds.add(f.id);

    if (typeof f.low !== 'number' || !Number.isFinite(f.low)) {
      throw new EngineError(`Factor '${f.id}' has non-finite low value`, 'INVALID_FACTOR_VALUE');
    }
    if (typeof f.typical !== 'number' || !Number.isFinite(f.typical)) {
      throw new EngineError(`Factor '${f.id}' has non-finite typical value`, 'INVALID_FACTOR_VALUE');
    }
    if (typeof f.high !== 'number' || !Number.isFinite(f.high)) {
      throw new EngineError(`Factor '${f.id}' has non-finite high value`, 'INVALID_FACTOR_VALUE');
    }

    if (f.low < 0 || f.typical < 0 || f.high < 0) {
      throw new EngineError(`Factor '${f.id}' contains negative values`, 'NEGATIVE_FACTOR_VALUE');
    }

    if (f.low > f.typical || f.typical > f.high) {
      throw new EngineError(
        `Factor '${f.id}' violates range ordering: low (${f.low}) <= typical (${f.typical}) <= high (${f.high})`,
        'RANGE_ORDER_VIOLATION'
      );
    }

    map[f.id] = f;
  }

  return map;
}

export function toFactorsMap(
  factors: FactorsMap | FactorSetPayload | Factor[]
): FactorsMap {
  if (Array.isArray(factors) || ('factors' in factors && Array.isArray((factors as FactorSetPayload).factors))) {
    return validateFactorSet(factors);
  }
  return factors as FactorsMap;
}
