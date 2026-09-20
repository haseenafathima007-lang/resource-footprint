import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import type { FactorSetPayload } from '../../types/factor.ts';
import fallbackFactors from '../../data/factors.v1.json';
import {
  type IFactorRepository,
  type Result,
  ok,
} from '../types.ts';
import { mapDbFactorSetToFactorSet, type DbFactorSetRow } from '../mappers.ts';

export class SupabaseFactorRepository implements IFactorRepository {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

  async getFactorSet(version: string | 'latest' = 'latest'): Promise<Result<FactorSetPayload>> {
    try {
      let query = this.client.from('factor_sets').select('*');

      if (version === 'latest') {
        query = query.order('effective_from', { ascending: false }).limit(1);
      } else {
        query = query.eq('version', version).limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        // Safe fallback to bundled factors.v1.json if offline or before database is reachable
        return ok(fallbackFactors as FactorSetPayload);
      }

      return ok(mapDbFactorSetToFactorSet(data as unknown as DbFactorSetRow));
    } catch (_e: unknown) {
      // Return bundled factors on network failure to maintain simulation capability
      return ok(fallbackFactors as FactorSetPayload);
    }
  }
}

export const factorRepository = new SupabaseFactorRepository();
