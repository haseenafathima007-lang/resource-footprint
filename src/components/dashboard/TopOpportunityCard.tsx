import React from 'react';
import { Lightbulb, ArrowRight, Droplets, Zap } from 'lucide-react';
import type { Suggestion, Period } from '@/engine';
import { formatTypicalValue, formatRange } from '@/lib/format.ts';

interface TopOpportunityCardProps {
  suggestion: Suggestion;
  period: Period;
  householdSize: number;
  onAdopt: (suggestion: Suggestion) => void;
}

export const TopOpportunityCard: React.FC<TopOpportunityCardProps> = ({
  suggestion,
  period,
  householdSize,
  onAdopt,
}) => {
  const periodSavings = suggestion.savings[period];
  const waterSav = periodSavings.water;
  const energySav = periodSavings.energy;

  const hasWater = waterSav.typical > 0;
  const hasEnergy = energySav.typical > 0;

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
          <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Top Opportunity</span>
        </div>
        {householdSize > 1 && (
          <span className="text-xs text-ink-muted bg-surface-raised px-2 py-0.5 rounded border border-border">
            Your share (H={householdSize})
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-ink tracking-tight">
          {suggestion.title || `Reduce ${suggestion.field}`}
        </h2>
        {suggestion.description && (
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            {suggestion.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 py-2 border-y border-border/50 text-sm">
        {hasWater && (
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-water/10 text-water">
              <Droplets className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <div className="font-bold text-ink">
                ~{formatTypicalValue(waterSav.typical)} <span className="text-xs font-normal text-ink-muted">L / {period}</span>
              </div>
              <div className="text-[11px] text-ink-muted">
                Range: {formatRange(waterSav.low, waterSav.high, 'L')}
              </div>
            </div>
          </div>
        )}

        {hasEnergy && (
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-energy/10 text-energy">
              <Zap className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <div className="font-bold text-ink">
                ~{formatTypicalValue(energySav.typical)} <span className="text-xs font-normal text-ink-muted">kWh / {period}</span>
              </div>
              <div className="text-[11px] text-ink-muted">
                Range: {formatRange(energySav.low, energySav.high, 'kWh')}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end pt-1">
        <button
          onClick={() => onAdopt(suggestion)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-ink hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
        >
          <span>Update My Baseline</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
