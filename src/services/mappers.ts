import type { BaselineProfile } from '../types/profile.ts';
import type { Deviation, DeviationField } from '../types/deviation.ts';
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
  group_id: string | null;
  start_date: string;
  end_date: string;
  field: string;
  mode: 'delta' | 'override';
  value: number | string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDeviationInsert {
  user_id: string;
  group_id?: string | null;
  start_date: string;
  end_date: string;
  field: string;
  mode: 'delta' | 'override';
  value: number;
  note?: string | null;
}

export const DEVIATION_FIELD_TO_DB: Record<DeviationField, string> = {
  showerMinutesPerDay: 'shower_minutes_per_day',
  acHoursPerDay: 'ac_hours_per_day',
  fanHoursPerDay: 'fan_hours_per_day',
  laptopHoursPerDay: 'laptop_hours_per_day',
  laundryLoadsPerWeek: 'laundry_loads_per_week',
};

export const DB_TO_DEVIATION_FIELD: Record<string, DeviationField> = {
  shower_minutes_per_day: 'showerMinutesPerDay',
  ac_hours_per_day: 'acHoursPerDay',
  fan_hours_per_day: 'fanHoursPerDay',
  laptop_hours_per_day: 'laptopHoursPerDay',
  laundry_loads_per_week: 'laundryLoadsPerWeek',
};

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
  const field = DB_TO_DEVIATION_FIELD[row.field] || (row.field as DeviationField);
  return {
    id: row.id,
    groupId: row.group_id,
    startDate: row.start_date,
    endDate: row.end_date,
    field,
    mode: row.mode as 'delta' | 'override',
    value: Number(row.value),
    note: row.note,
    createdAt: row.created_at,
  };
}

export function mapDeviationToDbInsert(
  deviation: Omit<Deviation, 'id' | 'createdAt'>,
  userId: string
): DbDeviationInsert {
  const dbField = DEVIATION_FIELD_TO_DB[deviation.field] || deviation.field;
  return {
    user_id: userId,
    group_id: deviation.groupId ?? null,
    start_date: deviation.startDate,
    end_date: deviation.endDate,
    field: dbField,
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
