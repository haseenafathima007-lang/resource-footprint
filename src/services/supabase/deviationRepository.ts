import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import type { Deviation } from '../../types/deviation.ts';
import {
  type IDeviationRepository,
  type Result,
  ok,
  err,
} from '../types.ts';
import {
  mapDbDeviationToDeviation,
  mapDeviationToDbInsert,
  type DbDeviationRow,
} from '../mappers.ts';

export class SupabaseDeviationRepository implements IDeviationRepository {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

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
    try {
      const { data: sessionData } = await this.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'You must be logged in to log a deviation.',
        });
      }

      if (deviation.endDate < deviation.startDate) {
        return err({
          code: 'VALIDATION',
          message: 'End date cannot be earlier than start date.',
        });
      }

      const insertData = mapDeviationToDbInsert(deviation, userId);

      const { data, error } = await this.client
        .from('deviations')
        .insert(insertData)
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
      if (deviation.startDate !== undefined) updatePayload.start_date = deviation.startDate;
      if (deviation.endDate !== undefined) updatePayload.end_date = deviation.endDate;
      if (deviation.field !== undefined) updatePayload.field = deviation.field;
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
}

export const deviationRepository = new SupabaseDeviationRepository();
