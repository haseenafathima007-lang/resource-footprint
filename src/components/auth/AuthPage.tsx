import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { baselineRepository } from '../../services/supabase/baselineRepository.ts';
import { postAuthDestination } from '@/lib/postAuthDestination.ts';

type AuthMode = 'signIn' | 'signUp' | 'magicLink';

export function AuthPage() {
  useEffect(() => {
    document.title = 'Sign In — Resource Footprint';
  }, []);

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signIn, signUp, signInWithMagicLink, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already signed in - safe render-time redirect without calling navigate() in render
  const locationFrom = (location.state as { from?: { pathname: string; search?: string } })?.from;
  const intendedFrom = locationFrom ? `${locationFrom.pathname}${locationFrom.search || ''}` : null;

  if (user) {
    const dest = postAuthDestination(true, intendedFrom);
    return <Navigate to={dest} replace />;
  }

  const resolveAndRedirect = async () => {
    const baselineRes = await baselineRepository.getCurrentBaseline();
    const hasBaseline = baselineRes.ok && !!baselineRes.data;
    const dest = postAuthDestination(hasBaseline, intendedFrom);
    navigate(dest, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalMessage(null);

    if (!email.trim()) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'magicLink') {
        const res = await signInWithMagicLink(email);
        if (res.ok) {
          setLocalMessage('Magic link sent! Check your email inbox (or Mailpit locally at port 54324).');
        } else {
          setLocalError(res.error.message);
        }
      } else if (mode === 'signUp') {
        if (!password || password.length < 6) {
          setLocalError('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        const res = await signUp(email, password, displayName);
        if (res.ok) {
          if (res.data.session) {
            await resolveAndRedirect();
          } else {
            setLocalMessage('Account created! Please confirm via email (or Mailpit at port 54324).');
          }
        } else {
          setLocalError(res.error.message);
        }
      } else {
        if (!password) {
          setLocalError('Please enter your password.');
          setSubmitting(false);
          return;
        }
        const res = await signIn(email, password);
        if (res.ok) {
          await resolveAndRedirect();
        } else {
          setLocalError(res.error.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-surface-raised border border-border rounded-xl shadow-sm text-ink">
      <h1 className="text-2xl font-bold text-ink mb-6 text-center">
        {mode === 'signIn' && 'Sign In'}
        {mode === 'signUp' && 'Create Account'}
        {mode === 'magicLink' && 'Sign In with Magic Link'}
      </h1>

      {localError && (
        <div
          role="alert"
          className="mb-4 p-3 bg-negative/10 text-negative border border-negative/20 rounded-lg text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{localError}</span>
        </div>
      )}

      {localMessage && (
        <div
          role="status"
          className="mb-4 p-3 bg-positive/10 text-positive border border-positive/20 rounded-lg text-sm flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{localMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signUp' && (
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1" htmlFor="displayName">
              Display Name (optional)
            </label>
            <div className="relative">
              <input
                id="displayName"
                type="text"
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 min-h-[44px] bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="e.g. Alex"
              />
              <User className="w-4 h-4 text-ink-muted absolute left-3 top-3.5" aria-hidden="true" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink-muted mb-1" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 min-h-[44px] bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="you@example.com"
            />
            <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-3.5" aria-hidden="true" />
          </div>
        </div>

        {mode !== 'magicLink' && (
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 min-h-[44px] bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="••••••••"
              />
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-3.5" aria-hidden="true" />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 min-h-[44px] bg-primary text-on-primary hover:bg-primary-hover font-semibold rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 text-sm"
        >
          {submitting ? (
            'Processing...'
          ) : (
            <>
              {mode === 'signIn' && 'Sign In'}
              {mode === 'signUp' && 'Create Account'}
              {mode === 'magicLink' && 'Send Magic Link'}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-4 flex flex-col gap-2 text-center text-sm text-ink-muted">
        {mode === 'signIn' && (
          <>
            <button
              type="button"
              onClick={() => {
                setMode('signUp');
                setLocalError(null);
                setLocalMessage(null);
              }}
              className="min-h-[44px] py-2 text-primary hover:underline font-medium"
            >
              Don't have an account? Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('magicLink');
                setLocalError(null);
                setLocalMessage(null);
              }}
              className="min-h-[44px] py-2 text-ink-muted hover:text-ink font-medium"
            >
              Sign in with passwordless magic link
            </button>
          </>
        )}

        {mode === 'signUp' && (
          <button
            type="button"
            onClick={() => {
              setMode('signIn');
              setLocalError(null);
              setLocalMessage(null);
            }}
            className="min-h-[44px] py-2 text-primary hover:underline font-medium"
          >
            Already have an account? Sign In
          </button>
        )}

        {mode === 'magicLink' && (
          <button
            type="button"
            onClick={() => {
              setMode('signIn');
              setLocalError(null);
              setLocalMessage(null);
            }}
            className="min-h-[44px] py-2 text-primary hover:underline font-medium"
          >
            Back to standard Sign In
          </button>
        )}
      </div>
    </div>
  );
}
