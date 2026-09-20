import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Sliders, ArrowRight, Droplets, Zap } from 'lucide-react';
import type { Suggestion, BaselineProfile, Period } from '@/engine';
import { serializeStateToQuery } from '@/lib/urlState.ts';
import { formatTypicalValue } from '@/lib/format.ts';
import { TrustBanner } from '@/components/simulator/TrustBanner.tsx';

interface SuggestionsSectionProps {
  baseline: BaselineProfile | null;
  suggestions: Suggestion[];
  period: Period;
  onAdopt: (suggestion: Suggestion) => void;
  factorsVersion?: string;
  factorsRegion?: string;
}

export const SuggestionsSection: React.FC<SuggestionsSectionProps> = ({
  baseline,
  suggestions,
  period,
  onAdopt,
  factorsVersion,
}) => {
  if (!baseline) {
    return (
      <section aria-labelledby="ways-to-reduce-heading" className="space-y-4">
        <h2 id="ways-to-reduce-heading" className="text-xl font-bold text-ink flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          <span>Ways to Reduce Your Footprint</span>
        </h2>
        <div className="p-6 rounded-2xl border border-border bg-surface-raised text-center space-y-3">
          <p className="text-sm text-ink-muted">
            Create your baseline habits profile to unlock personalized habit and equipment suggestions.
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-ink hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <span>Set Up Baseline</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="ways-to-reduce-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ways-to-reduce-heading" className="text-xl font-bold text-ink flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          <span>Ways to Reduce Your Footprint</span>
        </h2>
        <span className="text-xs text-ink-muted">
          Based on your habits
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map((s) => {
          const waterSav = s.savings[period].water;
          const energySav = s.savings[period].energy;

          const hasWater = waterSav.typical > 0;
          const hasEnergy = energySav.typical > 0;

          // Build scenario habits for simulator link
          const scenarioHabits = {
            showerMinutesPerDay: baseline.showerMinutesPerDay,
            acHoursPerDay: baseline.acHoursPerDay,
            fanHoursPerDay: baseline.fanHoursPerDay,
            laptopHoursPerDay: baseline.laptopHoursPerDay,
            laundryLoadsPerWeek: baseline.laundryLoadsPerWeek,
            ...(s.kind === 'habit' ? { [s.field]: Number(s.to) } : {}),
          };

          const simulatorQuery = serializeStateToQuery(baseline, scenarioHabits, period);

          return (
            <div
              key={s.ruleId}
              className="p-5 rounded-2xl border border-border bg-surface-raised space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-surface border border-border">
                    {s.kind === 'equipment' ? 'Equipment Choice' : 'Habit Shift'}
                  </span>
                  <span>
                    {s.from} &rarr; {s.to}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-ink leading-snug">
                  {s.title || `Reduce ${s.field}`}
                </h3>

                {s.kind === 'equipment' ? (
                  <p className="text-xs text-ink-muted leading-relaxed">
                    If you are replacing or choosing a machine, front-load washers use less water per cycle.
                  </p>
                ) : (
                  s.description && (
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {s.description}
                    </p>
                  )
                )}
              </div>

              <div className="space-y-3 border-t border-border pt-3">
                <div className="space-y-1 text-xs">
                  {hasWater && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium text-water">
                        <Droplets className="w-3.5 h-3.5" aria-hidden="true" /> Water
                      </span>
                      <span className="font-bold text-ink">
                        ~{formatTypicalValue(waterSav.typical)} L / {period}
                      </span>
                    </div>
                  )}

                  {hasEnergy && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium text-energy">
                        <Zap className="w-3.5 h-3.5" aria-hidden="true" /> Energy
                      </span>
                      <span className="font-bold text-ink">
                        ~{formatTypicalValue(energySav.typical)} kWh / {period}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Link
                    to={`/?${simulatorQuery}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium min-h-[44px]"
                  >
                    <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Try in simulator</span>
                  </Link>

                  <button
                    onClick={() => onAdopt(s)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:border-primary text-ink transition-colors min-h-[44px]"
                  >
                    Update my baseline
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <TrustBanner show={factorsVersion !== '1.0.0-verified'} />
      </div>
    </section>
  );
};
