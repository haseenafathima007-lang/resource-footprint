import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Period, Suggestion, BaselineProfile } from '@/engine';
import { useBaseline } from '@/hooks/useBaseline.ts';
import { useDeviations } from '@/hooks/useDeviations.ts';
import { useSuggestions } from '@/hooks/useSuggestions.ts';
import { useGoals } from '@/hooks/useGoals.ts';
import { useToday, type ClockFunction } from '@/hooks/useToday.ts';
import { createDashboardModel, calculate30DayDashboardModel } from '@/lib/dashboardModel.ts';
import { PeriodToggle } from '@/components/simulator/PeriodToggle.tsx';
import { SummaryCards } from '@/components/dashboard/SummaryCards.tsx';
import { ScoreCard } from '@/components/dashboard/ScoreCard.tsx';
import { BreakdownCharts } from '@/components/dashboard/BreakdownCharts.tsx';
import { HistoryChart } from '@/components/dashboard/HistoryChart.tsx';
import { ThirtyDayChart } from '@/components/dashboard/ThirtyDayChart.tsx';
import { TopOpportunityCard } from '@/components/dashboard/TopOpportunityCard.tsx';
import { SuggestionsSection } from '@/components/dashboard/SuggestionsSection.tsx';
import { DashboardGoalsCard } from '@/components/dashboard/DashboardGoalsCard.tsx';
import {
  DashboardSkeleton,
  DashboardError,
  DashboardEmpty,
} from '@/components/dashboard/DashboardStates.tsx';
import {
  Pencil,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  CalendarPlus,
  Target,
} from 'lucide-react';

interface DashboardPageProps {
  clock?: ClockFunction;
}

export function DashboardPage({ clock }: DashboardPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const confirmationMessage = (location.state as { confirmation?: string })?.confirmation;

  useEffect(() => {
    document.title = 'Personal Dashboard — Resource Footprint';
  }, []);

  const {
    loading: baselineLoading,
    error: baselineError,
    currentBaseline,
    currentFactors,
    history,
    reload: reloadBaseline,
  } = useBaseline();

  const {
    deviations,
    loading: deviationsLoading,
    error: deviationsError,
    reload: reloadDeviations,
  } = useDeviations();

  const { today } = useToday(clock);
  const { suggestions, topOpportunity } = useSuggestions(currentBaseline, currentFactors);
  const { activeGoals, isLoading: goalsLoading, error: goalsError } = useGoals(clock);

  // Period state: default Month, persisted in component state only
  const [period, setPeriod] = useState<Period>('month');

  // Compute model metrics via pure dashboardModel function
  const dashboardData = useMemo(() => {
    if (!currentBaseline || !currentFactors) return null;
    return createDashboardModel(currentBaseline, currentFactors, period);
  }, [currentBaseline, currentFactors, period]);

  // Compute 30-day baseline vs actual window model
  const thirtyDayModel = useMemo(() => {
    if (!currentBaseline || !currentFactors || history.length === 0) return null;

    const factorsByVersion: Record<string, import('@/engine').FactorSetPayload> = {};
    for (const h of history) {
      if (h.factors) {
        factorsByVersion[h.baseline.factorsVersion] = h.factors;
      }
    }
    if (currentFactors) {
      factorsByVersion[currentBaseline.factorsVersion] = currentFactors;
    }

    try {
      return calculate30DayDashboardModel({
        history: history.map((h) => h.baseline),
        deviations,
        factorsByVersion,
        today,
      });
    } catch {
      return null;
    }
  }, [currentBaseline, currentFactors, history, deviations, today]);

  const handleAdoptSuggestion = useCallback(
    (s: Suggestion) => {
      if (!currentBaseline) return;
      const proposedProfile: BaselineProfile = {
        ...currentBaseline,
        ...(s.kind === 'habit' ? { [s.field]: Number(s.to) } : {}),
        ...(s.kind === 'equipment' ? { [s.field]: s.to as 'frontLoad' } : {}),
      };
      navigate('/onboarding', { state: { proposed: proposedProfile } });
    },
    [currentBaseline, navigate]
  );

  const loading = baselineLoading || deviationsLoading;
  const error = baselineError || deviationsError;

  const handleRetry = async () => {
    await Promise.all([reloadBaseline(), reloadDeviations()]);
  };

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
        <DashboardError message={error} onRetry={handleRetry} />
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
            to="/goals"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-ink hover:opacity-90 transition-opacity shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Target className="w-4 h-4" aria-hidden="true" />
            <span>Goals</span>
          </Link>

          <Link
            to="/log"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-xl border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <CalendarPlus className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Log a Change</span>
          </Link>

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
            <span>Simulator</span>
          </Link>

          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Top Opportunity Card & Goals Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section aria-labelledby="top-opportunity-heading" className="lg:col-span-2">
          <h2 id="top-opportunity-heading" className="sr-only">
            Top Reduction Opportunity
          </h2>
          {topOpportunity ? (
            <TopOpportunityCard
              suggestion={topOpportunity}
              period={period}
              householdSize={currentBaseline.householdSize}
              onAdopt={handleAdoptSuggestion}
            />
          ) : (
            <div className="p-5 rounded-2xl border border-border bg-surface-raised text-center text-xs text-ink-muted">
              Your baseline habits are already optimal! No immediate suggestions found.
            </div>
          )}
        </section>
        <div className="lg:col-span-1">
          <DashboardGoalsCard
            activeGoals={activeGoals}
            isLoading={goalsLoading}
            error={goalsError}
          />
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

      {/* Ways to Reduce Section (Suggestions Cards + Trust Notice) */}
      <SuggestionsSection
        baseline={currentBaseline}
        suggestions={suggestions}
        period={period}
        onAdopt={handleAdoptSuggestion}
        factorsVersion={currentFactors.version}
        factorsRegion={currentFactors.region}
      />

      {/* 30-Day Activity & Actuals Section */}
      {thirtyDayModel && (
        <section aria-labelledby="thirty-day-heading">
          <ThirtyDayChart model={thirtyDayModel} />
        </section>
      )}

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

