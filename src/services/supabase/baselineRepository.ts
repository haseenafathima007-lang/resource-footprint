import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import type { BaselineProfile } from '../../types/profile.ts';
import {
  type IBaselineRepository,
  type Result,
  ok,
  err,
} from '../types.ts';
import {
  mapDbBaselineToBaseline,
  mapBaselineToDbInsert,
  type DbBaselineProfileRow,
} from '../mappers.ts';
import { validateProfile } from '@/engine';

export class SupabaseBaselineRepository implements IBaselineRepository {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

  async getCurrentBaseline(): Promise<Result<BaselineProfile | null>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to view your baseline profile.',
        });
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.client
        .from('baseline_profiles')
        .select('*')
        .eq('user_id', userId)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to retrieve current baseline.',
          details: error.message,
        });
      }

      if (!data) {
        return ok(null);
      }

      return ok(mapDbBaselineToBaseline(data as unknown as DbBaselineProfileRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while retrieving baseline profile.',
        details: e,
      });
    }
  }

  async getBaselineHistory(): Promise<Result<BaselineProfile[]>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to view baseline history.',
        });
      }

      const { data, error } = await this.client
        .from('baseline_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('effective_from', { ascending: false });

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to retrieve baseline history.',
          details: error.message,
        });
      }

      const history = (data || []).map((row) =>
        mapDbBaselineToBaseline(row as unknown as DbBaselineProfileRow)
      );

      return ok(history);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while retrieving baseline history.',
        details: e,
      });
    }
  }

  async saveBaseline(profile: BaselineProfile): Promise<Result<BaselineProfile>> {
    // 1. Run engine's validateProfile FIRST. If invalid, return errors without calling DB.
    const validationErrors = validateProfile(profile as unknown as Record<string, unknown>);
    if (validationErrors) {
      return err({
        code: 'VALIDATION',
        message: 'Baseline profile inputs are out of valid bounds.',
        details: validationErrors,
      });
    }

    try {
      // 2. Ensure user is authenticated
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to save your baseline profile.',
        });
      }

      // Default effectiveFrom to today if not provided
      const effectiveFrom = profile.effectiveFrom || new Date().toISOString().split('T')[0];
      const profileToSave: BaselineProfile = { ...profile, effectiveFrom };

      const insertData = mapBaselineToDbInsert(profileToSave, userId);

      // Append-only rule: upsert on (user_id, effective_from)
      const { data, error } = await this.client
        .from('baseline_profiles')
        .upsert(insertData, { onConflict: 'user_id,effective_from' })
        .select()
        .single();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to save baseline profile.',
          details: error.message,
        });
      }

      return ok(mapDbBaselineToBaseline(data as unknown as DbBaselineProfileRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while saving baseline profile.',
        details: e,
      });
    }
  }
}

export const baselineRepository = new SupabaseBaselineRepository();
