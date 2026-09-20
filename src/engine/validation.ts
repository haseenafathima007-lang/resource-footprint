import type { BaselineProfile } from './types.ts';

export class EngineError extends Error {
  constructor(message: string, public readonly code: string = 'INVALID_INPUT') {
    super(message);
    this.name = 'EngineError';
  }
}

export const PROFILE_BOUNDS = {
  householdSize: { min: 1, max: 20 },
  showerMinutesPerDay: { min: 0, max: 120 },
  acHoursPerDay: { min: 0, max: 24 },
  fanHoursPerDay: { min: 0, max: 24 },
  laptopHoursPerDay: { min: 0, max: 24 },
  laundryLoadsPerWeek: { min: 0, max: 50 },
} as const;

/**
 * Validates baseline profile fields against PROFILE_BOUNDS and domain constraints.
 * Checks for NaN, Infinity, negative values, and bound violations.
 * Returns an error record or null if valid.
 */
export function validateProfile(
  data: Record<string, unknown>
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (data.householdSize !== undefined) {
    const val = Number(data.householdSize);
    if (!Number.isFinite(val) || !Number.isInteger(val) || val < PROFILE_BOUNDS.householdSize.min || val > PROFILE_BOUNDS.householdSize.max) {
      errors.householdSize = `Household size must be an integer between ${PROFILE_BOUNDS.householdSize.min} and ${PROFILE_BOUNDS.householdSize.max}`;
    }
  }

  if (data.showerMinutesPerDay !== undefined) {
    const val = Number(data.showerMinutesPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.showerMinutesPerDay.min || val > PROFILE_BOUNDS.showerMinutesPerDay.max) {
      errors.showerMinutesPerDay = `Shower minutes per day must be between ${PROFILE_BOUNDS.showerMinutesPerDay.min} and ${PROFILE_BOUNDS.showerMinutesPerDay.max}`;
    }
  }

  if (data.acHoursPerDay !== undefined) {
    const val = Number(data.acHoursPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.acHoursPerDay.min || val > PROFILE_BOUNDS.acHoursPerDay.max) {
      errors.acHoursPerDay = `AC hours per day must be between ${PROFILE_BOUNDS.acHoursPerDay.min} and ${PROFILE_BOUNDS.acHoursPerDay.max}`;
    }
  }

  if (data.fanHoursPerDay !== undefined) {
    const val = Number(data.fanHoursPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.fanHoursPerDay.min || val > PROFILE_BOUNDS.fanHoursPerDay.max) {
      errors.fanHoursPerDay = `Fan hours per day must be between ${PROFILE_BOUNDS.fanHoursPerDay.min} and ${PROFILE_BOUNDS.fanHoursPerDay.max}`;
    }
  }

  if (data.laptopHoursPerDay !== undefined) {
    const val = Number(data.laptopHoursPerDay);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.laptopHoursPerDay.min || val > PROFILE_BOUNDS.laptopHoursPerDay.max) {
      errors.laptopHoursPerDay = `Laptop hours per day must be between ${PROFILE_BOUNDS.laptopHoursPerDay.min} and ${PROFILE_BOUNDS.laptopHoursPerDay.max}`;
    }
  }

  if (data.laundryLoadsPerWeek !== undefined) {
    const val = Number(data.laundryLoadsPerWeek);
    if (!Number.isFinite(val) || val < PROFILE_BOUNDS.laundryLoadsPerWeek.min || val > PROFILE_BOUNDS.laundryLoadsPerWeek.max) {
      errors.laundryLoadsPerWeek = `Laundry loads per week must be between ${PROFILE_BOUNDS.laundryLoadsPerWeek.min} and ${PROFILE_BOUNDS.laundryLoadsPerWeek.max}`;
    }
  }

  if (data.showerHeater !== undefined && data.showerHeater !== 'none' && data.showerHeater !== 'electric') {
    errors.showerHeater = `Shower heater must be either 'none' or 'electric'`;
  }

  if (data.laundryMachine !== undefined && data.laundryMachine !== 'topLoad' && data.laundryMachine !== 'frontLoad') {
    errors.laundryMachine = `Laundry machine must be either 'topLoad' or 'frontLoad'`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export function assertValidProfile(profile: Partial<BaselineProfile>): void {
  const errors = validateProfile(profile as Record<string, unknown>);
  if (errors) {
    const firstKey = Object.keys(errors)[0];
    throw new EngineError(errors[firstKey], 'INVALID_PROFILE');
  }
}
