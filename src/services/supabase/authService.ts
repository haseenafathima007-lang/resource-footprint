import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import {
  type IAuthService,
  type Result,
  ok,
  err,
} from '../types.ts';

export class SupabaseAuthService implements IAuthService {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

  async signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<Result<{ user: User | null; session: Session | null }>> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: displayName ? { display_name: displayName.trim() } : undefined,
        },
      });

      if (error) {
        return err({
          code: 'VALIDATION',
          message: error.message,
        });
      }

      return ok({ user: data.user, session: data.session });
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Unable to connect to authentication service.',
        details: e,
      });
    }
  }

  async signIn(
    email: string,
    password: string
  ): Promise<Result<{ user: User; session: Session }>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return err({
          code: 'UNAUTHENTICATED',
          message: 'Invalid email or password. Please try again.',
        });
      }

      if (!data.user || !data.session) {
        return err({
          code: 'UNKNOWN',
          message: 'Authentication completed but user or session is missing.',
        });
      }

      return ok({ user: data.user, session: data.session });
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Network error while attempting to sign in.',
        details: e,
      });
    }
  }

  async signInWithMagicLink(email: string): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        return err({
          code: 'VALIDATION',
          message: error.message,
        });
      }

      return ok(undefined);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Failed to send magic link.',
        details: e,
      });
    }
  }

  async signOut(): Promise<Result<void>> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) {
        return err({
          code: 'UNKNOWN',
          message: error.message,
        });
      }
      return ok(undefined);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Error during sign out.',
        details: e,
      });
    }
  }

  async getSession(): Promise<Result<Session | null>> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) {
        return err({
          code: 'UNKNOWN',
          message: error.message,
        });
      }
      return ok(data.session);
    } catch (e: unknown) {
      return err({
        code: 'NETWORK',
        message: 'Unable to retrieve session.',
        details: e,
      });
    }
  }

  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ): { unsubscribe: () => void } {
    const { data } = this.client.auth.onAuthStateChange(callback);
    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  }
}

export const authService = new SupabaseAuthService();
