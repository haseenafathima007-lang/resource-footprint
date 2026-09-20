import type { User, Session } from '@supabase/supabase-js';
import type { BaselineProfile } from '../types/profile.ts';
import type { Deviation } from '../types/deviation.ts';
import type { FactorSetPayload, Factor } from '../types/factor.ts';
import type { Goal, GoalInput, GoalStatus } from '../engine/goals.ts';

export type ServiceErrorCode =
  | 'UNAUTHENTICATED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'UNKNOWN'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'LIMIT_REACHED'
  | 'TEAM_FULL'
  | 'INVALID_CODE';

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
  details?: Record<string, string> | unknown;
}

export type Result<T, E = ServiceError> =
  | { ok: true; data: T; error?: never }
  | { ok: false; error: E; data?: never };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E = ServiceError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthService {
  signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<Result<{ user: User | null; session: Session | null }>>;
  signIn(
    email: string,
    password: string
  ): Promise<Result<{ user: User; session: Session }>>;
  signInWithMagicLink(email: string): Promise<Result<void>>;
  signOut(): Promise<Result<void>>;
  getSession(): Promise<Result<Session | null>>;
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ): { unsubscribe: () => void };
}

export interface IProfileRepository {
  getProfile(userId: string): Promise<Result<UserProfile | null>>;
  updateDisplayName(displayName: string): Promise<Result<UserProfile>>;
}

export interface IBaselineRepository {
  getCurrentBaseline(): Promise<Result<BaselineProfile | null>>;
  getBaselineHistory(): Promise<Result<BaselineProfile[]>>;
  saveBaseline(profile: BaselineProfile): Promise<Result<BaselineProfile>>;
}

export interface IDeviationRepository {
  list(range?: { startDate: string; endDate: string }): Promise<Result<Deviation[]>>;
  add(deviation: Omit<Deviation, 'id' | 'createdAt'>): Promise<Result<Deviation>>;
  addMany(deviations: Omit<Deviation, 'id' | 'createdAt'>[]): Promise<Result<Deviation[]>>;
  update(id: string, deviation: Partial<Deviation>): Promise<Result<Deviation>>;
  remove(id: string): Promise<Result<void>>;
  removeGroup(groupId: string): Promise<Result<void>>;
}

export interface IFactorRepository {
  getFactorSet(version?: string | 'latest'): Promise<Result<FactorSetPayload>>;
}

export interface IGoalRepository {
  list(status?: GoalStatus): Promise<Result<Goal[]>>;
  create(
    input: GoalInput,
    referenceProfile: BaselineProfile,
    startDate: string,
    factors: FactorSetPayload | Factor[]
  ): Promise<Result<Goal>>;
  archive(id: string): Promise<Result<Goal>>;
  remove(id: string): Promise<Result<void>>;
}

// ============================================================================
// Phase 7 Team Interfaces
// ============================================================================

export type TeamRole = 'owner' | 'member';
export type TargetResource = 'water' | 'energy';

export interface MyTeam {
  id: string;
  name: string;
  role: TeamRole;
  alias: string;
  sharing: boolean;
  memberCount: number;
  targetResource: TargetResource | null;
  targetAmount: number | null;
  showLeaderboard: boolean;
  createdAt: string;
  joinCode: string | null;
}

export interface TeamMember {
  memberId: string;
  alias: string;
  role: TeamRole;
  sharing: boolean;
  joinedAt: string;
}

export interface TeamSummary {
  memberCount: number;
  sharingCount: number;
  visible: boolean;
  daysWindow: number;
  totalWaterSavedL: number | null;
  totalEnergySavedKwh: number | null;
  targetResource: TargetResource | null;
  targetAmount: number | null;
  targetProgress: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  alias: string;
  pctWater: number;
  pctEnergy: number;
  pctOverall: number;
  daysCounted: number;
  isMe: boolean;
}

export interface CreateTeamInput {
  name: string;
  alias: string;
  referenceProfile: BaselineProfile;
  baselineWaterLDay: number;
  baselineEnergyKwhDay: number;
  targetResource?: TargetResource | null;
  targetAmount?: number | null;
}

export interface JoinTeamInput {
  code: string;
  alias: string;
  referenceProfile: BaselineProfile;
  baselineWaterLDay: number;
  baselineEnergyKwhDay: number;
}

export interface UpdateMembershipInput {
  teamId: string;
  alias: string;
  sharing: boolean;
}

export interface UpdateTeamSettingsInput {
  teamId: string;
  showLeaderboard: boolean;
  targetResource?: TargetResource | null;
  targetAmount?: number | null;
}

export interface ContributionPayloadRow {
  day: string;
  water_saved_l: number;
  energy_saved_kwh: number;
}

export interface ITeamRepository {
  getMyTeams(): Promise<Result<MyTeam[]>>;
  createTeam(input: CreateTeamInput): Promise<Result<{ id: string; joinCode: string }>>;
  joinTeam(input: JoinTeamInput): Promise<Result<{ teamId: string; name: string }>>;
  leaveTeam(teamId: string): Promise<Result<void>>;
  deleteTeam(teamId: string): Promise<Result<void>>;
  removeMember(teamId: string, memberId: string): Promise<Result<void>>;
  rotateCode(teamId: string): Promise<Result<string>>;
  updateMembership(input: UpdateMembershipInput): Promise<Result<void>>;
  updateTeamSettings(input: UpdateTeamSettingsInput): Promise<Result<void>>;
  upsertMyContributions(teamId: string, rows: ContributionPayloadRow[]): Promise<Result<void>>;
  getTeamMembers(teamId: string): Promise<Result<TeamMember[]>>;
  getTeamSummary(teamId: string): Promise<Result<TeamSummary>>;
  getLeaderboard(teamId: string): Promise<Result<LeaderboardEntry[]>>;
}
