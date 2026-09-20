import React, { useState, useEffect } from 'react';
import { User, LogOut, CheckCircle2, AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import { baselineRepository } from '../../services/supabase/baselineRepository.ts';
import type { BaselineProfile } from '../../types/profile.ts';
import { clearPendingBaseline } from '@/lib/pendingBaseline.ts';

export function AccountPage() {
  useEffect(() => {
    document.title = 'Account Settings — Resource Footprint';
  }, []);

  const { user, profile, updateDisplayName, signOut } = useAuth();
  const [displayNameInput, setDisplayNameInput] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<BaselineProfile | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(true);

  const currentDisplayName = displayNameInput ?? (profile?.displayName ?? '');

  useEffect(() => {
    async function loadBaseline() {
      setLoadingBaseline(true);
      const res = await baselineRepository.getCurrentBaseline();
      if (res.ok) {
        setBaseline(res.data);
      }
      setLoadingBaseline(false);
    }
    loadBaseline();
  }, []);

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setUpdating(true);

    const res = await updateDisplayName(currentDisplayName);
    setUpdating(false);

    if (res.ok) {
      setStatusMessage('Display name updated successfully.');
      setDisplayNameInput(null);
    } else {
      setErrorMessage(res.error.message);
    }
  };

  const handleSignOut = async () => {
    clearPendingBaseline();
    await signOut();
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-surface-raised border border-border rounded-xl shadow-sm space-y-6 text-ink">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Account Settings</h1>
          <p className="text-sm text-ink-muted">Manage your profile and authentication session</p>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] min-w-[44px] bg-surface hover:bg-surface-subtle text-ink text-sm font-medium rounded-lg border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LogOut className="w-4 h-4 text-ink-muted" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="p-3 bg-positive/10 border border-positive/20 text-positive text-sm rounded-lg flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-3 bg-negative/10 border border-negative/20 text-negative text-sm rounded-lg flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">Email</span>
          <p className="text-sm font-medium text-ink mt-0.5">{user?.email}</p>
        </div>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">User ID</span>
          <p className="text-xs font-mono text-ink-muted mt-0.5 break-all">{user?.id}</p>
        </div>

        <form onSubmit={handleUpdateDisplayName} className="space-y-3 pt-2">
          <label className="block text-sm font-medium text-ink" htmlFor="accountDisplayName">
            Display Name
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="accountDisplayName"
                type="text"
                maxLength={80}
                value={currentDisplayName}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Enter your name"
                className="w-full pl-10 pr-3 py-2 min-h-[44px] bg-surface border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <User className="w-4 h-4 text-ink-muted absolute left-3 top-3.5" aria-hidden="true" />
            </div>
            <button
              type="submit"
              disabled={updating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary text-on-primary hover:bg-primary-hover text-sm font-semibold rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              {updating && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Save Name</span>
            </button>
          </div>
        </form>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-ink">Baseline Profile</h2>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline min-h-[44px] py-2"
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
        {loadingBaseline ? (
          <p className="text-sm text-ink-muted animate-pulse">Loading baseline...</p>
        ) : baseline ? (
          <div className="p-4 bg-surface-subtle border border-border rounded-lg text-sm text-ink space-y-1.5">
            <p>
              <strong className="text-ink">Effective Date:</strong> {baseline.effectiveFrom}
            </p>
            <p>
              <strong className="text-ink">Household Size:</strong> {baseline.householdSize}
            </p>
            <p>
              <strong className="text-ink">Shower:</strong> {baseline.showerMinutesPerDay} min/day ({baseline.showerHeater} heater)
            </p>
            <p>
              <strong className="text-ink">Cooling:</strong> AC {baseline.acHoursPerDay}h, Fan {baseline.fanHoursPerDay}h, Laptop {baseline.laptopHoursPerDay}h
            </p>
            <p>
              <strong className="text-ink">Laundry:</strong> {baseline.laundryLoadsPerWeek} loads/wk ({baseline.laundryMachine})
            </p>
            <div className="pt-2">
              <Link
                to="/onboarding"
                className="text-xs font-medium text-primary hover:underline inline-block min-h-[44px] py-2"
              >
                Update baseline wizard &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-surface-subtle border border-border rounded-lg text-sm text-ink-muted">
            <p>No baseline profile configured yet.</p>
            <Link
              to="/onboarding"
              className="mt-2 inline-block text-xs font-semibold text-primary hover:underline min-h-[44px] py-2"
            >
              Complete Onboarding Wizard &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
