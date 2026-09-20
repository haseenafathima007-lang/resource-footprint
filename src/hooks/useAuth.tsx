import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/supabase/authService.ts';
import { profileRepository } from '../services/supabase/profileRepository.ts';
import type { UserProfile, Result } from '../services/types.ts';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<Result<{ user: User | null; session: Session | null }>>;
  signIn: (
    email: string,
    password: string
  ) => Promise<Result<{ user: User; session: Session }>>;
  signInWithMagicLink: (email: string) => Promise<Result<void>>;
  signOut: () => Promise<Result<void>>;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<Result<UserProfile>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async (userId: string) => {
    const res = await profileRepository.getProfile(userId);
    if (res.ok) {
      setProfile(res.data);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  }, [user, loadUserProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const sessionRes = await authService.getSession();
        if (mounted && sessionRes.ok && sessionRes.data) {
          setSession(sessionRes.data);
          setUser(sessionRes.data.user);
          if (sessionRes.data.user?.id) {
            await loadUserProfile(sessionRes.data.user.id);
          }
        }
      } catch (_err: unknown) {
        if (mounted) setError('Failed to restore authentication session.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { unsubscribe } = authService.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      if (currentUser?.id) {
        await loadUserProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [loadUserProfile]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    setError(null);
    const res = await authService.signUp(email, password, displayName);
    if (!res.ok) {
      setError(res.error.message);
    }
    return res;
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    const res = await authService.signIn(email, password);
    if (!res.ok) {
      setError(res.error.message);
    }
    return res;
  };

  const signInWithMagicLink = async (email: string) => {
    setError(null);
    const res = await authService.signInWithMagicLink(email);
    if (!res.ok) {
      setError(res.error.message);
    }
    return res;
  };

  const signOut = async () => {
    setError(null);
    const res = await authService.signOut();
    if (res.ok) {
      setUser(null);
      setSession(null);
      setProfile(null);
    } else {
      setError(res.error.message);
    }
    return res;
  };

  const updateDisplayName = async (displayName: string) => {
    setError(null);
    const res = await profileRepository.updateDisplayName(displayName);
    if (res.ok) {
      setProfile(res.data);
    } else {
      setError(res.error.message);
    }
    return res;
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    refreshProfile,
    updateDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
