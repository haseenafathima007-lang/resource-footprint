import type { BaselineProfile } from '@/engine';
import { validateProfile } from '@/engine';

export const PENDING_BASELINE_KEY = 'rf.pendingBaseline';
export const PENDING_BASELINE_VERSION = 1;
export const PENDING_BASELINE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface StoredPendingBaseline {
  version: number;
  savedAt: number;
  baseline: BaselineProfile;
}

/**
 * Saves a guest baseline to localStorage with a timestamp and schema version.
 * Pre-validates profile bounds using the engine before writing.
 * Wraps storage access in try/catch; never throws.
 */
export function savePendingBaseline(baseline: BaselineProfile): boolean {
  try {
    const errors = validateProfile(baseline as unknown as Record<string, unknown>);
    if (errors) {
      return false;
    }

    const payload: StoredPendingBaseline = {
      version: PENDING_BASELINE_VERSION,
      savedAt: Date.now(),
      baseline,
    };

    localStorage.setItem(PENDING_BASELINE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads and validates a pending guest baseline from localStorage.
 * Discards expired, corrupted, unknown-version, or out-of-bounds data.
 * Wraps all access in try/catch; never throws.
 */
export function loadPendingBaseline(): BaselineProfile | null {
  try {
    const raw = localStorage.getItem(PENDING_BASELINE_KEY);
    if (!raw) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      clearPendingBaseline();
      return null;
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('version' in parsed) ||
      !('savedAt' in parsed) ||
      !('baseline' in parsed)
    ) {
      clearPendingBaseline();
      return null;
    }

    const item = parsed as StoredPendingBaseline;

    if (item.version !== PENDING_BASELINE_VERSION) {
      clearPendingBaseline();
      return null;
    }

    if (typeof item.savedAt !== 'number' || !Number.isFinite(item.savedAt)) {
      clearPendingBaseline();
      return null;
    }

    // Check 24-hour expiration
    if (Date.now() - item.savedAt > PENDING_BASELINE_TTL_MS || item.savedAt > Date.now() + 60000) {
      clearPendingBaseline();
      return null;
    }

    // Validate profile fields and bounds through engine
    if (!item.baseline || typeof item.baseline !== 'object') {
      clearPendingBaseline();
      return null;
    }

    const errors = validateProfile(item.baseline as unknown as Record<string, unknown>);
    if (errors) {
      clearPendingBaseline();
      return null;
    }

    return item.baseline;
  } catch {
    return null;
  }
}

/**
 * Clears the pending guest baseline from localStorage.
 * Wraps storage access in try/catch; never throws.
 */
export function clearPendingBaseline(): void {
  try {
    localStorage.removeItem(PENDING_BASELINE_KEY);
  } catch {
    // Ignore storage errors
  }
}
