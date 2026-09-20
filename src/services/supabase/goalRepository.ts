import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import type { BaselineProfile } from '../../types/profile.ts';
import type { FactorSetPayload, Factor } from '../../types/factor.ts';
import {
  type Goal,
  type GoalInput,
  type GoalStatus,
  validateGoalInput,
  validateProfile,
} from '@/engine';
import {
  type IGoalRepository,
  type Result,
  ok,
  err,
} from '../types.ts';
import {
  mapDbGoalToGoal,
  mapGoalToDbInsert,
  type DbGoalRow,
} from '../mappers.ts';

export class SupabaseGoalRepository implements IGoalRepository {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

  async list(status?: GoalStatus): Promise<Result<Goal[]>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to view goals.',
        });
      }

      let query = this.client
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to retrieve goals.',
          details: error.message,
        });
      }

      const goals: Goal[] = (data || []).map((row) => {
        const goal = mapDbGoalToGoal(row as unknown as DbGoalRow);
        // Validate snapshot integrity on read
        const profileErrors = validateProfile(goal.referenceProfile as unknown as Record<string, unknown>);
        if (profileErrors) {
          // If reference snapshot is corrupted, mark status as unavailable
          return {
            ...goal,
            status: 'unavailable' as unknown as GoalStatus,
          };
        }
        return goal;
      });

      return ok(goals);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while fetching goals.',
        details: e,
      });
    }
  }

  async create(
    input: GoalInput,
    referenceProfile: BaselineProfile,
    startDate: string,
    factors: FactorSetPayload | Factor[]
  ): Promise<Result<Goal>> {
    // 1. Client-side pure engine pre-validation BEFORE DB call
    const validation = validateGoalInput(input, referenceProfile, factors);
    if (validation.errors) {
      return err({
        code: 'VALIDATION',
        message: 'Goal input is invalid.',
        details: validation.errors,
      });
    }

    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to create a goal.',
        });
      }

      const insertData = mapGoalToDbInsert(input, referenceProfile, startDate, userId);

      const { data, error } = await this.client
        .from('goals')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('idx_goals_user_resource_period_active')
        ) {
          return err({
            code: 'CONFLICT',
            message: `You already have an active ${input.period} ${input.resource} goal. Archive it first.`,
            details: error.message,
          });
        }
        return err({
          code: 'UNKNOWN',
          message: 'Failed to create goal.',
          details: error.message,
        });
      }

      return ok(mapDbGoalToGoal(data as unknown as DbGoalRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while creating goal.',
        details: e,
      });
    }
  }

  async archive(id: string): Promise<Result<Goal>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to archive a goal.',
        });
      }

      const { data, error } = await this.client
        .from('goals')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to archive goal.',
          details: error.message,
        });
      }

      return ok(mapDbGoalToGoal(data as unknown as DbGoalRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while archiving goal.',
        details: e,
      });
    }
  }

  async remove(id: string): Promise<Result<void>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to delete a goal.',
        });
      }

      const { error } = await this.client
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to delete goal.',
          details: error.message,
        });
      }

      return ok(undefined);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while deleting goal.',
        details: e,
      });
    }
  }
}

export const goalRepository = new SupabaseGoalRepository();
