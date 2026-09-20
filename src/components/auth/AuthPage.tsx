import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';

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

  // Redirect if already signed in
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/account';

  if (user) {
    navigate(from, { replace: true });
  }

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
            navigate(from, { replace: true });
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
          navigate(from, { replace: true });
        } else {
          setLocalError(res.error.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {mode === 'signIn' && 'Sign In'}
        {mode === 'signUp' && 'Create Account'}
        {mode === 'magicLink' && 'Sign In with Magic Link'}
      </h2>

      {localError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
          {localError}
        </div>
      )}

      {localMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-sm">
          {localMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signUp' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="displayName">
              Display Name (optional)
            </label>
            <input
              id="displayName"
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Alex"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="you@example.com"
          />
        </div>

        {mode !== 'magicLink' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-md transition-colors"
        >
          {submitting
            ? 'Processing...'
            : mode === 'signIn'
            ? 'Sign In'
            : mode === 'signUp'
            ? 'Sign Up'
            : 'Send Magic Link'}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm space-y-2">
        {mode === 'signIn' ? (
          <>
            <p>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signUp');
                  setLocalError(null);
                  setLocalMessage(null);
                }}
                className="text-emerald-600 hover:underline font-medium"
              >
                Sign Up
              </button>
            </p>
            <p>
              Prefer passwordless?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('magicLink');
                  setLocalError(null);
                  setLocalMessage(null);
                }}
                className="text-emerald-600 hover:underline font-medium"
              >
                Sign in with Magic Link
              </button>
            </p>
          </>
        ) : mode === 'signUp' ? (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signIn');
                setLocalError(null);
                setLocalMessage(null);
              }}
              className="text-emerald-600 hover:underline font-medium"
            >
              Sign In
            </button>
          </p>
        ) : (
          <p>
            Back to{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signIn');
                setLocalError(null);
                setLocalMessage(null);
              }}
              className="text-emerald-600 hover:underline font-medium"
            >
              Password Sign In
            </button>
          </p>
        )}

        <p className="pt-2">
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-xs">
            &larr; Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
