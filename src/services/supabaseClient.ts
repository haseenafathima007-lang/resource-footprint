import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { env } from './env.ts';

/**
 * Singleton Supabase client initialized with validated environment variables.
 * Uses ONLY the public anon key.
 */
export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
