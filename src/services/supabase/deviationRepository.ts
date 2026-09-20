import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import type { Deviation } from '../../types/deviation.ts';
import { validateDeviation, toISODate } from '@/engine';
import {
  type IDeviationRepository,
  type Result,
  ok,
  err,
} from '../types.ts';
import {
  mapDbDeviationToDeviation,
  mapDeviationToDbInsert,
  DEVIATION_FIELD_TO_DB,
  type DbDeviationRow,
} from '../mappers.ts';

export class SupabaseDeviationRepository implements IDeviationRepository {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

  private getToday(): string {
    return toISODate(new Date());
  }

  async list(range?: { startDate: string; endDate: string }): Promise<Result<Deviation[]>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to view deviations.',
        });
      }

      let query = this.client
        .from('deviations')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (range) {
        query = query
          .gte('end_date', range.startDate)
          .lte('start_date', range.endDate);
      }

      const { data, error } = await query;

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to retrieve deviations.',
          details: error.message,
        });
      }

      const deviations = (data || []).map((row) =>
        mapDbDeviationToDeviation(row as unknown as DbDeviationRow)
      );

      return ok(deviations);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while fetching deviations.',
        details: e,
      });
    }
  }

  async add(deviation: Omit<Deviation, 'id' | 'createdAt'>): Promise<Result<Deviation>> {
    // 1. Engine pre-validation
    const today = this.getToday();
    const validationErrors = validateDeviation(deviation, today);
    if (validationErrors) {
      return err({
        code: 'VALIDATION',
        message: 'Deviation inputs are invalid.',
        details: validationErrors,
      });
    }

    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to log a deviation.',
        });
      }

      const insertData = mapDeviationToDbInsert(deviation, userId);

      const { data, error } = await this.client
        .from('deviations')
        .insert(insertData as unknown as Database['public']['Tables']['deviations']['Insert'])
        .select()
        .single();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to record deviation.',
          details: error.message,
        });
      }

      return ok(mapDbDeviationToDeviation(data as unknown as DbDeviationRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while recording deviation.',
        details: e,
      });
    }
  }

  async addMany(deviations: Omit<Deviation, 'id' | 'createdAt'>[]): Promise<Result<Deviation[]>> {
    if (!deviations || deviations.length === 0) {
      return ok([]);
    }

    // 1. Pre-validate every deviation in the array
    const today = this.getToday();
    for (let i = 0; i < deviations.length; i++) {
      const errors = validateDeviation(deviations[i], today);
      if (errors) {
        return err({
          code: 'VALIDATION',
          message: `Deviation at index ${i} is invalid.`,
          details: errors,
        });
      }
    }

    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to log deviations.',
        });
      }

      const insertArray = deviations.map((d) => mapDeviationToDbInsert(d, userId));

      // Single atomic array insert
      const { data, error } = await this.client
        .from('deviations')
        .insert(insertArray as unknown as Database['public']['Tables']['deviations']['Insert'][])
        .select();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to record deviations batch.',
          details: error.message,
        });
      }

      const inserted = (data || []).map((row) =>
        mapDbDeviationToDeviation(row as unknown as DbDeviationRow)
      );

      return ok(inserted);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while recording deviations batch.',
        details: e,
      });
    }
  }

  async update(id: string, deviation: Partial<Deviation>): Promise<Result<Deviation>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to update a deviation.',
        });
      }

      const updatePayload: Database['public']['Tables']['deviations']['Update'] = {};
      if (deviation.groupId !== undefined) updatePayload.group_id = deviation.groupId;
      if (deviation.startDate !== undefined) updatePayload.start_date = deviation.startDate;
      if (deviation.endDate !== undefined) updatePayload.end_date = deviation.endDate;
      if (deviation.field !== undefined) updatePayload.field = DEVIATION_FIELD_TO_DB[deviation.field] || deviation.field;
      if (deviation.mode !== undefined) updatePayload.mode = deviation.mode;
      if (deviation.value !== undefined) updatePayload.value = deviation.value;
      if (deviation.note !== undefined) updatePayload.note = deviation.note;

      const { data, error } = await this.client
        .from('deviations')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to update deviation.',
          details: error.message,
        });
      }

      return ok(mapDbDeviationToDeviation(data as unknown as DbDeviationRow));
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while updating deviation.',
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
          message: 'You must be logged in to delete a deviation.',
        });
      }

      const { error } = await this.client
        .from('deviations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to delete deviation.',
          details: error.message,
        });
      }

      return ok(undefined);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while deleting deviation.',
        details: e,
      });
    }
  }

  async removeGroup(groupId: string): Promise<Result<void>> {
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to delete deviations.',
        });
      }

      const { error } = await this.client
        .from('deviations')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        return err({
          code: 'UNKNOWN',
          message: 'Failed to delete deviation group.',
          details: error.message,
        });
      }

      return ok(undefined);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while deleting deviation group.',
        details: e,
      });
    }
  }
}

export const deviationRepository = new SupabaseDeviationRepository();
