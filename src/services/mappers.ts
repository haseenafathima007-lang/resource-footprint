import type { BaselineProfile } from '../types/profile.ts';
import type { Deviation, DeviationField } from '../types/deviation.ts';
import type { FactorSetPayload } from '../types/factor.ts';
import type { Goal, GoalInput } from '../engine/goals.ts';
import type {
  UserProfile,
  MyTeam,
  TeamMember,
  TeamSummary,
  LeaderboardEntry,
  TargetResource,
  TeamRole,
} from './types.ts';

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

export interface DbGoalRow {
  id: string;
  user_id: string;
  resource: 'water' | 'energy';
  period: 'week' | 'month';
  target_amount: number | string;
  start_date: string;
  reference_profile: Record<string, unknown>;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DbGoalInsert {
  user_id: string;
  resource: 'water' | 'energy';
  period: 'week' | 'month';
  target_amount: number;
  start_date: string;
  reference_profile: Record<string, unknown>;
  status?: 'active' | 'archived';
}

export function mapDbGoalToGoal(row: DbGoalRow): Goal {
  const refSnapshot = row.reference_profile as unknown as BaselineProfile;
  return {
    id: row.id,
    userId: row.user_id,
    resource: row.resource,
    period: row.period,
    targetAmount: Number(row.target_amount),
    startDate: row.start_date,
    referenceProfile: refSnapshot,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGoalToDbInsert(
  input: GoalInput,
  referenceProfile: BaselineProfile,
  startDate: string,
  userId: string
): DbGoalInsert {
  return {
    user_id: userId,
    resource: input.resource,
    period: input.period,
    target_amount: input.targetAmount,
    start_date: startDate,
    reference_profile: referenceProfile as unknown as Record<string, unknown>,
    status: 'active',
  };
}

// ============================================================================
// Phase 7 Team Mappers
// ============================================================================

export function mapRpcMyTeamToMyTeam(row: Record<string, unknown>): MyTeam {
  return {
    id: String(row.id),
    name: String(row.name),
    role: row.role as TeamRole,
    alias: String(row.alias),
    sharing: Boolean(row.sharing),
    memberCount: Number(row.member_count),
    targetResource: (row.target_resource as TargetResource) || null,
    targetAmount: row.target_amount != null ? Number(row.target_amount) : null,
    showLeaderboard: Boolean(row.show_leaderboard),
    createdAt: String(row.created_at),
    joinCode: row.join_code ? String(row.join_code) : null,
  };
}

export function mapRpcTeamMemberToTeamMember(row: Record<string, unknown>): TeamMember {
  return {
    memberId: String(row.member_id),
    alias: String(row.alias),
    role: row.role as TeamRole,
    sharing: Boolean(row.sharing),
    joinedAt: String(row.joined_at),
  };
}

export function mapRpcTeamSummaryToTeamSummary(row: Record<string, unknown>): TeamSummary {
  return {
    memberCount: Number(row.member_count),
    sharingCount: Number(row.sharing_count),
    visible: Boolean(row.visible),
    daysWindow: Number(row.days_window ?? 30),
    totalWaterSavedL: row.total_water_saved_l != null ? Number(row.total_water_saved_l) : null,
    totalEnergySavedKwh: row.total_energy_saved_kwh != null ? Number(row.total_energy_saved_kwh) : null,
    targetResource: (row.target_resource as TargetResource) || null,
    targetAmount: row.target_amount != null ? Number(row.target_amount) : null,
    targetProgress: row.target_progress != null ? Number(row.target_progress) : null,
  };
}

export function mapRpcLeaderboardEntryToLeaderboardEntry(row: Record<string, unknown>): LeaderboardEntry {
  return {
    rank: Number(row.rank),
    alias: String(row.alias),
    pctWater: Number(row.pct_water),
    pctEnergy: Number(row.pct_energy),
    pctOverall: Number(row.pct_overall),
    daysCounted: Number(row.days_counted),
    isMe: Boolean(row.is_me),
  };
}
