import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Period } from '@/engine';
import { useBaseline } from '@/hooks/useBaseline.ts';
import { createDashboardModel } from '@/lib/dashboardModel.ts';
import { PeriodToggle } from '@/components/simulator/PeriodToggle.tsx';
import { SummaryCards } from '@/components/dashboard/SummaryCards.tsx';
import { ScoreCard } from '@/components/dashboard/ScoreCard.tsx';
import { BreakdownCharts } from '@/components/dashboard/BreakdownCharts.tsx';
import { HistoryChart } from '@/components/dashboard/HistoryChart.tsx';
import {
  DashboardSkeleton,
  DashboardError,
  DashboardEmpty,
} from '@/components/dashboard/DashboardStates.tsx';
import { TrustBanner } from '@/components/simulator/TrustBanner.tsx';
import {
  Pencil,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export function DashboardPage() {
  const location = useLocation();
  const confirmationMessage = (location.state as { confirmation?: string })?.confirmation;

  useEffect(() => {
    document.title = 'Personal Dashboard — Resource Footprint';
  }, []);

  const {
    loading,
    error,
    currentBaseline,
    currentFactors,
    history,
    reload,
  } = useBaseline();

  // Period state: default Month, persisted in component state only
  const [period, setPeriod] = useState<Period>('month');

  // Compute model metrics via pure dashboardModel function
  const dashboardData = useMemo(() => {
    if (!currentBaseline || !currentFactors) return null;
    return createDashboardModel(currentBaseline, currentFactors, period);
  }, [currentBaseline, currentFactors, period]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <DashboardError message={error} onRetry={reload} />
      </div>
    );
  }

  if (!currentBaseline) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <DashboardEmpty />
      </div>
    );
  }

  if (!currentFactors) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div
          role="alert"
          className="p-6 bg-surface-raised border border-energy/30 rounded-2xl text-center space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-energy/10 text-energy flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-ink">Factor Version Unavailable</h2>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            The factor version referenced by your current baseline ({currentBaseline.factorsVersion}) could not be resolved from the repository.
          </p>
          <div className="pt-2">
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary text-on-primary hover:bg-primary-hover text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              Update baseline with current factors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 text-ink">
      {/* Save Confirmation Toast / Banner */}
      {confirmationMessage && (
        <div
          role="status"
          className="p-3.5 bg-positive/10 border border-positive/20 text-positive rounded-xl text-sm flex items-center gap-2.5 shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="font-medium">{confirmationMessage}</span>
        </div>
      )}

      {/* Trust Notice (driven by factors verified status) */}
      <TrustBanner show={!dashboardData.allVerified} />

      {/* Dashboard Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Personal Impact
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink mt-0.5">
            Resource Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Baseline effective since {currentBaseline.effectiveFrom} &bull; Household of {currentBaseline.householdSize}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/onboarding"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-xl border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Pencil className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Edit Baseline</span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-xl border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Sliders className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>Try Simulator</span>
          </Link>

          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Top Metrics: Water Card, Energy Card, and Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SummaryCards totals={dashboardData.totals} period={period} />
        </div>
        <div className="lg:col-span-1">
          <ScoreCard score={dashboardData.score} />
        </div>
      </div>

      {/* Category Breakdown Section (Recharts & Screen-Reader Table) */}
      <section aria-labelledby="breakdown-heading">
        <BreakdownCharts
          breakdown={dashboardData.breakdown}
          period={period}
        />
      </section>

      {/* Historical Trend Section */}
      <section aria-labelledby="history-heading">
        <HistoryChart history={history} />
      </section>
    </div>
  );
}

export default DashboardPage;
