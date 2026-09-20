import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import {
  type IProfileRepository,
  type UserProfile,
  type Result,
  ok,
  err,
} from '../types.ts';
import { mapDbProfileToProfile, type DbProfileRow } from '../mappers.ts';

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

  async getProfile(userId: string): Promise<Result<UserProfile | null>> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to fetch user profile.',
          details: error.message,
        });
      }

      if (!data) {
        return ok(null);
      }

      return ok(mapDbProfileToProfile(data as DbProfileRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while fetching profile.',
        details: e,
      });
    }
  }

  async updateDisplayName(displayName: string): Promise<Result<UserProfile>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to update your profile.',
        });
      }

      const trimmed = displayName.trim();
      if (trimmed.length > 80) {
        return err({
          code: 'VALIDATION',
          message: 'Display name cannot exceed 80 characters.',
        });
      }

      const { data, error } = await this.client
        .from('profiles')
        .update({ display_name: trimmed.length > 0 ? trimmed : null })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to update display name.',
          details: error.message,
        });
      }

      return ok(mapDbProfileToProfile(data as DbProfileRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while updating display name.',
        details: e,
      });
    }
  }
}

export const profileRepository = new SupabaseProfileRepository();
