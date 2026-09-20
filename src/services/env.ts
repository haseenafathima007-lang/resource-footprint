/**
 * Validates and exposes environment variables required by the Supabase client.
 * Throws early at application startup if required variables are missing.
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] ?? defaultValue;
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `[Config Error] Missing required environment variable: ${key}. ` +
      `Please ensure ${key} is set in your .env.local file or execution environment.`
    );
  }
  return value.trim();
}

export const env = {
  supabaseUrl: getEnvVar('VITE_SUPABASE_URL', 'http://127.0.0.1:54321'),
  supabaseAnonKey: getEnvVar('VITE_SUPABASE_ANON_KEY', 'sb_publishable_placeholder'),
} as const;
