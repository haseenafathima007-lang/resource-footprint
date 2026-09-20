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
  | 'CONFLICT';

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
