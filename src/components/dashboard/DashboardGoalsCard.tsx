import React from 'react';
import { Link } from 'react-router-dom';
import { Target, ArrowRight, CheckCircle2, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import type { GoalWithProgress } from '@/hooks/useGoals.ts';
import { formatTypicalValue } from '@/lib/format.ts';

interface DashboardGoalsCardProps {
  activeGoals: GoalWithProgress[];
  isLoading?: boolean;
  error?: string | null;
}

export const DashboardGoalsCard: React.FC<DashboardGoalsCardProps> = ({
  activeGoals,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl border border-border bg-surface-raised animate-pulse space-y-3">
        <div className="h-4 w-32 bg-surface rounded"></div>
        <div className="h-10 w-full bg-surface rounded"></div>
      </div>
    );
  }

  // Graceful degradation: errors loading goals do not crash dashboard
  if (error) {
    return (
      <div className="p-4 rounded-2xl border border-border bg-surface-raised flex items-center justify-between text-xs text-ink-muted">
        <span>Goal tracking temporarily unavailable.</span>
        <Link to="/goals" className="text-primary hover:underline font-semibold">
          View Goals
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-border bg-surface-raised space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-base text-ink flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>Active Goals</span>
        </h3>
        <Link
          to="/goals"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>Manage Goals</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {activeGoals.length === 0 ? (
        <div className="p-4 rounded-xl bg-surface border border-border text-center space-y-2">
          <p className="text-xs text-ink-muted">
            No active goals yet. Set a target to track your progress over time.
          </p>
          <Link
            to="/goals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-ink hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <Target className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Set a Goal</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map(({ goal, progress }) => {
            const unit = goal.resource === 'water' ? 'L' : 'kWh';
            const percent = Math.min(100, Math.round(progress.ratioTypical * 100));

            let StatusIcon = Clock;
            let statusText = 'Getting started';
            let badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';

            if (progress.status === 'achieved') {
              StatusIcon = CheckCircle2;
              statusText = 'Goal Achieved';
              badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            } else if (progress.status === 'on_pace') {
              StatusIcon = TrendingUp;
              statusText = 'On pace';
              badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            } else if (progress.status === 'not_there_yet') {
              StatusIcon = AlertTriangle;
              statusText = 'Not there yet';
              badgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            }

            return (
              <div
                key={goal.id}
                className="p-3.5 rounded-xl bg-surface border border-border space-y-2"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="font-semibold text-ink capitalize">
                    Save {goal.targetAmount} {unit} / {goal.period}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeClass}`}>
                    <StatusIcon className="w-3 h-3" aria-hidden="true" />
                    <span>{statusText}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-ink-muted">
                    <span>Saved so far: ~{formatTypicalValue(progress.saved.typical)} {unit}</span>
                    <span>{percent}%</span>
                  </div>
                  <div
                    className="w-full bg-surface-raised rounded-full h-2 overflow-hidden border border-border/50"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${goal.period} ${goal.resource} goal progress: ${percent}%`}
                  >
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
