import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw, Compass, ArrowRight } from 'lucide-react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse" aria-label="Loading dashboard data" role="status">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-surface-subtle rounded-md" />
          <div className="h-8 w-64 bg-surface-subtle rounded-lg" />
        </div>
        <div className="h-10 w-48 bg-surface-subtle rounded-xl" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="h-40 bg-surface-subtle rounded-2xl border border-border" />
        <div className="h-40 bg-surface-subtle rounded-2xl border border-border" />
        <div className="h-40 bg-surface-subtle rounded-2xl border border-border" />
      </div>

      {/* Breakdown charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-surface-subtle rounded-2xl border border-border" />
        <div className="h-80 bg-surface-subtle rounded-2xl border border-border" />
      </div>

      {/* History chart skeleton */}
      <div className="h-72 bg-surface-subtle rounded-2xl border border-border" />
    </div>
  );
};

interface DashboardErrorProps {
  message: string;
  onRetry: () => void;
}

export const DashboardError: React.FC<DashboardErrorProps> = ({ message, onRetry }) => {
  return (
    <div
      role="alert"
      className="max-w-xl mx-auto my-16 p-6 sm:p-8 bg-surface-raised border border-negative/20 rounded-2xl shadow-sm text-center space-y-4"
    >
      <div className="w-12 h-12 rounded-2xl bg-negative/10 text-negative flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-ink">Unable to Load Dashboard</h2>
      <p className="text-sm text-ink-muted">{message}</p>
      <div className="pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] min-w-[44px] bg-primary text-on-primary hover:bg-primary-hover text-sm font-semibold rounded-xl shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="w-4 h-4 text-on-primary" aria-hidden="true" />
          <span>Retry Loading</span>
        </button>
      </div>
    </div>
  );
};

export const DashboardEmpty: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto my-16 p-8 sm:p-10 bg-surface-raised border border-border rounded-2xl shadow-sm text-center space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <Compass className="w-7 h-7" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-ink">Welcome to Your Dashboard</h2>
        <p className="text-sm text-ink-muted mt-1.5 max-w-md mx-auto">
          You haven't set up your baseline habit profile yet. Complete the 4-step wizard to see your personalized resource footprint and historical insights.
        </p>
      </div>
      <div className="pt-3">
        <Link
          to="/onboarding"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] min-w-[44px] bg-primary text-on-primary hover:bg-primary-hover text-sm font-semibold rounded-xl shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Start Onboarding Wizard</span>
          <ArrowRight className="w-4 h-4 text-on-primary" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
