import type { BaselineProfile } from '../types/profile.ts';
import type { Deviation, DeviationField, DeviationMode } from '../types/deviation.ts';
import type { FactorSetPayload } from '../types/factor.ts';
import type { UserProfile } from './types.ts';

// Database row interfaces (snake_case)
export interface DbProfileRow {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBaselineProfileRow {
  id: string;
  user_id: string;
  effective_from: string;
  household_size: number;
  shower_minutes_per_day: number | string;
  shower_heater: 'none' | 'electric';
  ac_hours_per_day: number | string;
  fan_hours_per_day: number | string;
  laptop_hours_per_day: number | string;
  laundry_loads_per_week: number | string;
  laundry_machine: 'topLoad' | 'frontLoad';
  factors_version: string;
  created_at: string;
}

export interface DbBaselineProfileInsert {
  user_id: string;
  effective_from: string;
  household_size: number;
  shower_minutes_per_day: number;
  shower_heater: 'none' | 'electric';
  ac_hours_per_day: number;
  fan_hours_per_day: number;
  laptop_hours_per_day: number;
  laundry_loads_per_week: number;
  laundry_machine: 'topLoad' | 'frontLoad';
  factors_version: string;
}

export interface DbDeviationRow {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  field: DeviationField;
  mode: DeviationMode;
  value: number | string;
  note: string | null;
  created_at: string;
}

export interface DbDeviationInsert {
  user_id: string;
  start_date: string;
  end_date: string;
  field: DeviationField;
  mode: DeviationMode;
  value: number;
  note?: string | null;
}

export interface DbFactorSetRow {
  version: string;
  region: string;
  effective_from: string;
  payload: unknown;
  created_at: string;
}

// Pure Mapper Functions

export function mapDbProfileToProfile(row: DbProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDbBaselineToBaseline(row: DbBaselineProfileRow): BaselineProfile {
  return {
    id: row.id,
    userId: row.user_id,
    effectiveFrom: row.effective_from,
    householdSize: Number(row.household_size),
    showerMinutesPerDay: Number(row.shower_minutes_per_day),
    showerHeater: row.shower_heater,
    acHoursPerDay: Number(row.ac_hours_per_day),
    fanHoursPerDay: Number(row.fan_hours_per_day),
    laptopHoursPerDay: Number(row.laptop_hours_per_day),
    laundryLoadsPerWeek: Number(row.laundry_loads_per_week),
    laundryMachine: row.laundry_machine,
    factorsVersion: row.factors_version,
    createdAt: row.created_at,
  };
}

export function mapBaselineToDbInsert(
  profile: BaselineProfile,
  userId: string
): DbBaselineProfileInsert {
  return {
    user_id: userId,
    effective_from: profile.effectiveFrom,
    household_size: profile.householdSize,
    shower_minutes_per_day: profile.showerMinutesPerDay,
    shower_heater: profile.showerHeater,
    ac_hours_per_day: profile.acHoursPerDay,
    fan_hours_per_day: profile.fanHoursPerDay,
    laptop_hours_per_day: profile.laptopHoursPerDay,
    laundry_loads_per_week: profile.laundryLoadsPerWeek,
    laundry_machine: profile.laundryMachine,
    factors_version: profile.factorsVersion,
  };
}

export function mapDbDeviationToDeviation(row: DbDeviationRow): Deviation {
  return {
    id: row.id,
    userId: row.user_id,
    startDate: row.start_date,
    endDate: row.end_date,
    field: row.field,
    mode: row.mode,
    value: Number(row.value),
    note: row.note,
    createdAt: row.created_at,
  };
}

export function mapDeviationToDbInsert(
  deviation: Omit<Deviation, 'id' | 'createdAt'>,
  userId: string
): DbDeviationInsert {
  return {
    user_id: userId,
    start_date: deviation.startDate,
    end_date: deviation.endDate,
    field: deviation.field,
    mode: deviation.mode,
    value: deviation.value,
    note: deviation.note ?? null,
  };
}

export function mapDbFactorSetToFactorSet(row: DbFactorSetRow): FactorSetPayload {
  const payload = row.payload as FactorSetPayload;
  return {
    version: row.version,
    region: row.region,
    effectiveFrom: row.effective_from,
    factors: Array.isArray(payload?.factors) ? payload.factors : [],
  };
}
