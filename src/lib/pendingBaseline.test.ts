// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BaselineProfile } from '@/engine';
import {
  savePendingBaseline,
  loadPendingBaseline,
  clearPendingBaseline,
  PENDING_BASELINE_KEY,
  PENDING_BASELINE_TTL_MS,
} from './pendingBaseline.ts';

const validBaseline: BaselineProfile = {
  effectiveFrom: '2026-01-01',
  factorsVersion: '1.0.0',
  householdSize: 2,
  showerMinutesPerDay: 15,
  showerHeater: 'electric',
  acHoursPerDay: 5,
  fanHoursPerDay: 8,
  laptopHoursPerDay: 7,
  laundryLoadsPerWeek: 3,
  laundryMachine: 'frontLoad',
};

// Ensure a reliable in-memory storage for test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  },
};

describe('pendingBaseline', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves and loads a valid baseline (round trip)', () => {
    const saved = savePendingBaseline(validBaseline);
    expect(saved).toBe(true);

    const loaded = loadPendingBaseline();
    expect(loaded).toEqual(validBaseline);
  });

  it('clears stored baseline explicitly', () => {
    savePendingBaseline(validBaseline);
    expect(loadPendingBaseline()).not.toBeNull();

    clearPendingBaseline();
    expect(loadPendingBaseline()).toBeNull();
    expect(localStorage.getItem(PENDING_BASELINE_KEY)).toBeNull();
  });

  it('discards expired baseline (> 24 hours) and cleans up storage', () => {
    const expiredTime = Date.now() - (PENDING_BASELINE_TTL_MS + 1000);
    const payload = {
      version: 1,
      savedAt: expiredTime,
      baseline: validBaseline,
    };
    localStorage.setItem(PENDING_BASELINE_KEY, JSON.stringify(payload));

    const loaded = loadPendingBaseline();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(PENDING_BASELINE_KEY)).toBeNull();
  });

  it('discards corrupted JSON and clears storage', () => {
    localStorage.setItem(PENDING_BASELINE_KEY, 'not-valid-json{');

    const loaded = loadPendingBaseline();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(PENDING_BASELINE_KEY)).toBeNull();
  });

  it('discards unknown schema version and clears storage', () => {
    const payload = {
      version: 99,
      savedAt: Date.now(),
      baseline: validBaseline,
    };
    localStorage.setItem(PENDING_BASELINE_KEY, JSON.stringify(payload));

    const loaded = loadPendingBaseline();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(PENDING_BASELINE_KEY)).toBeNull();
  });

  it('discards out-of-bounds baseline values', () => {
    const invalidProfile = {
      ...validBaseline,
      showerMinutesPerDay: 999, // Max is 120 per bounds
    };
    const payload = {
      version: 1,
      savedAt: Date.now(),
      baseline: invalidProfile,
    };
    localStorage.setItem(PENDING_BASELINE_KEY, JSON.stringify(payload));

    const loaded = loadPendingBaseline();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(PENDING_BASELINE_KEY)).toBeNull();
  });

  it('refuses to save out-of-bounds baseline', () => {
    const invalidProfile = {
      ...validBaseline,
      householdSize: 0, // Min is 1
    };
    const saved = savePendingBaseline(invalidProfile as unknown as BaselineProfile);
    expect(saved).toBe(false);
    expect(localStorage.getItem(PENDING_BASELINE_KEY)).toBeNull();
  });

  it('handles storage unavailable / throwing without throwing error', () => {
    vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => savePendingBaseline(validBaseline)).not.toThrow();
    const result = savePendingBaseline(validBaseline);
    expect(result).toBe(false);
  });

  it('handles localStorage getItem throwing gracefully', () => {
    vi.spyOn(localStorageMock, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => loadPendingBaseline()).not.toThrow();
    expect(loadPendingBaseline()).toBeNull();
  });
});
