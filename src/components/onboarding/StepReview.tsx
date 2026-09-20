import React, { useMemo } from 'react';
import type { BaselineProfile } from '@/engine';
import { calculateProfile, scaleToPeriod } from '@/engine';
import factorsData from '@/data/factors.v1.json';
import { formatTypicalValue, formatRange } from '@/lib/format.ts';
import { Droplets, Zap, Pencil, CheckCircle } from 'lucide-react';
import type { WizardStep } from '@/hooks/useWizard.ts';

interface StepReviewProps {
  profile: BaselineProfile;
  onGoToStep: (step: WizardStep) => void;
}

export const StepReview: React.FC<StepReviewProps> = ({
  profile,
  onGoToStep,
}) => {
  // Compute live estimates using engine
  const { dailyResult, monthlyResult } = useMemo(() => {
    const daily = calculateProfile(profile, factorsData);
    const monthly = scaleToPeriod(daily, 'month');
    return { dailyResult: daily, monthlyResult: monthly };
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs text-ink-muted">Review Your Baseline</p>
          <p className="text-sm font-medium text-ink">
            Confirm your typical habits and check your estimated daily and monthly impact
          </p>
        </div>
      </div>

      {/* Live Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Water Card */}
        <div className="p-4 rounded-xl border border-water/30 bg-water-bg/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-water flex items-center gap-1.5">
              <Droplets className="w-4 h-4" aria-hidden="true" />
              Estimated Water
            </span>
            <span className="text-xs text-ink-muted">Per day / month</span>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink">
                ~{formatTypicalValue(dailyResult.water.typical)}
              </span>
              <span className="text-sm text-ink-muted">L / day</span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Range: {formatRange(dailyResult.water.low, dailyResult.water.high, 'L')}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-border/40 text-xs text-ink-muted">
            Monthly projection: <strong className="text-ink">~{formatTypicalValue(monthlyResult.water.typical)} L</strong>
          </div>
        </div>

        {/* Energy Card */}
        <div className="p-4 rounded-xl border border-energy/30 bg-energy-bg/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-energy flex items-center gap-1.5">
              <Zap className="w-4 h-4" aria-hidden="true" />
              Estimated Energy
            </span>
            <span className="text-xs text-ink-muted">Per day / month</span>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink">
                ~{formatTypicalValue(dailyResult.energy.typical)}
              </span>
              <span className="text-sm text-ink-muted">kWh / day</span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Range: {formatRange(dailyResult.energy.low, dailyResult.energy.high, 'kWh')}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-border/40 text-xs text-ink-muted">
            Monthly projection: <strong className="text-ink">~{formatTypicalValue(monthlyResult.energy.typical)} kWh</strong>
          </div>
        </div>
      </div>

      {/* Answer Summaries with Edit Links */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-ink">Configured Habit Details</h3>

        {/* Step 1 Summary */}
        <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Showers</span>
            <p className="text-sm font-medium text-ink">
              {profile.showerMinutesPerDay} minutes / day &bull; {profile.showerHeater === 'electric' ? 'Electric Geyser' : 'Solar / Gas / Ambient'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(1)}
            aria-label="Edit showers step"
            className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-medium text-primary hover:text-primary-hover hover:bg-surface-subtle rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>

        {/* Step 2 Summary */}
        <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Cooling & Devices</span>
            <p className="text-sm font-medium text-ink">
              AC: {profile.acHoursPerDay}h &bull; Fan: {profile.fanHoursPerDay}h &bull; Laptop: {profile.laptopHoursPerDay}h
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(2)}
            aria-label="Edit cooling and devices step"
            className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-medium text-primary hover:text-primary-hover hover:bg-surface-subtle rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>

        {/* Step 3 Summary */}
        <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Laundry & Household</span>
            <p className="text-sm font-medium text-ink">
              {profile.householdSize} {profile.householdSize === 1 ? 'person' : 'people'} &bull; {profile.laundryLoadsPerWeek} loads/wk ({profile.laundryMachine === 'topLoad' ? 'Top Load' : 'Front Load'})
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(3)}
            aria-label="Edit laundry and household step"
            className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-medium text-primary hover:text-primary-hover hover:bg-surface-subtle rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
