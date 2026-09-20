import React, { useState, useMemo } from 'react';
import { Target, Droplets, Zap, AlertTriangle, Sparkles, Check } from 'lucide-react';
import type {
  BaselineProfile,
  FactorSetPayload,
  GoalInput,
  GoalResource,
  GoalPeriod,
} from '@/engine';
import {
  validateGoalInput,
  calculateProfile,
  toFactorsMap,
  suggest,
  coverageOfGoal,
} from '@/engine';
import { formatTypicalValue } from '@/lib/format.ts';

interface GoalFormProps {
  referenceProfile: BaselineProfile;
  factors: FactorSetPayload;
  onSave: (input: GoalInput) => Promise<{ ok: boolean; error?: any }>;
  conflictError?: string | null;
  onArchiveConflictGoal?: () => void;
}

export const GoalForm: React.FC<GoalFormProps> = ({
  referenceProfile,
  factors,
  onSave,
  conflictError,
  onArchiveConflictGoal,
}) => {
  const [resource, setResource] = useState<GoalResource>('water');
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [targetAmountStr, setTargetAmountStr] = useState<string>('150');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const targetAmount = Number(targetAmountStr);

  const factorsMap = useMemo(() => toFactorsMap(factors), [factors]);

  // Compute reference profile typical usage for period
  const typicalUsage = useMemo(() => {
    const daily = calculateProfile(referenceProfile, factorsMap);
    const multiplier = period === 'week' ? 7 : 30;
    return (daily[resource]?.typical || 0) * multiplier;
  }, [referenceProfile, factorsMap, resource, period]);

  // Engine preset chips: 5%, 10%, 20%
  const presetChips = useMemo(() => {
    const p5 = Math.max(1, Math.round(typicalUsage * 0.05));
    const p10 = Math.max(1, Math.round(typicalUsage * 0.10));
    const p20 = Math.max(1, Math.round(typicalUsage * 0.20));
    return [
      { label: '5% (Gentle)', value: p5 },
      { label: '10% (Moderate)', value: p10 },
      { label: '20% (Strong)', value: p20 },
    ];
  }, [typicalUsage]);

  // Live validation via pure engine function
  const validation = useMemo(() => {
    return validateGoalInput(
      { resource, period, targetAmount },
      referenceProfile,
      factorsMap
    );
  }, [resource, period, targetAmount, referenceProfile, factorsMap]);

  // Generate top suggestions for coverage hint
  const suggestions = useMemo(() => {
    try {
      return suggest(referenceProfile, factorsMap, undefined, { limit: 2 });
    } catch {
      return [];
    }
  }, [referenceProfile, factorsMap]);

  const unit = resource === 'water' ? 'L' : 'kWh';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validation.errors || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await onSave({ resource, period, targetAmount });
      if (!res.ok) {
        setSubmitError(res.error?.message || 'Failed to save goal.');
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-2xl border border-border bg-surface-raised space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Target className="w-5 h-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-bold text-ink">Set a Resource Reduction Goal</h2>
      </div>

      {/* Resource & Period Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Resource
          </label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Resource choice">
            <button
              type="button"
              role="radio"
              aria-checked={resource === 'water'}
              onClick={() => setResource('water')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                resource === 'water'
                  ? 'border-water bg-water/10 text-water shadow-sm'
                  : 'border-border bg-surface text-ink hover:bg-surface-subtle'
              }`}
            >
              <Droplets className="w-4 h-4" />
              <span>Water (Litres)</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={resource === 'energy'}
              onClick={() => setResource('energy')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                resource === 'energy'
                  ? 'border-energy bg-energy/10 text-energy shadow-sm'
                  : 'border-border bg-surface text-ink hover:bg-surface-subtle'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Energy (kWh)</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Time Window
          </label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Period choice">
            <button
              type="button"
              role="radio"
              aria-checked={period === 'week'}
              onClick={() => setPeriod('week')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                period === 'week'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-surface text-ink hover:bg-surface-subtle'
              }`}
            >
              <span>Per Week (7 days)</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={period === 'month'}
              onClick={() => setPeriod('month')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                period === 'month'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-surface text-ink hover:bg-surface-subtle'
              }`}
            >
              <span>Per Month (30 days)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-ink-muted">
            Target Reduction Presets
          </span>
          <span className="text-ink-muted">
            Typical use: ~{formatTypicalValue(typicalUsage)} {unit} / {period}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {presetChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setTargetAmountStr(chip.value.toString())}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all min-h-[44px] ${
                targetAmount === chip.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-ink hover:border-primary/50'
              }`}
            >
              {chip.label}: {chip.value} {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input Field */}
      <div className="space-y-1.5">
        <label htmlFor="targetAmount" className="text-xs font-bold text-ink">
          Custom Target Amount ({unit} per {period})
        </label>
        <input
          id="targetAmount"
          type="number"
          min="1"
          max="1000000"
          value={targetAmountStr}
          onChange={(e) => setTargetAmountStr(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
          placeholder={`Enter target in ${unit}`}
        />
      </div>

      {/* Live Preview & Engine Validation Notices */}
      {Number.isFinite(targetAmount) && targetAmount > 0 && (
        <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between text-ink">
            <span className="font-medium">Calculated Target Share:</span>
            <span className="font-bold text-primary">
              ~{Math.round((targetAmount / (typicalUsage || 1)) * 100)}% of your typical {period} (~{formatTypicalValue(typicalUsage)} {unit})
            </span>
          </div>

          {validation.warnings?.targetAmount && (
            <div role="status" className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{validation.warnings.targetAmount}</span>
            </div>
          )}

          {/* "What could help" lines from coverageOfGoal */}
          {suggestions.length > 0 && !validation.errors && (
            <div className="pt-2 border-t border-border/50 space-y-1 text-ink-muted">
              <div className="font-semibold text-ink flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>What Could Help You Reach This Target</span>
              </div>
              {suggestions.map((s) => {
                const cov = coverageOfGoal(s, { resource, period, targetAmount });
                if (cov <= 0) return null;
                const percentCov = Math.round(cov * 100);
                return (
                  <p key={s.ruleId} className="text-xs">
                    &bull; <strong>{s.title}</strong> alone would cover about <strong>{percentCov}%</strong> of this target.
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inline Validation Errors */}
      {validation.errors?.targetAmount && (
        <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{validation.errors.targetAmount}</span>
        </div>
      )}

      {/* CONFLICT handling */}
      {(conflictError || submitError) && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{conflictError || submitError}</span>
          </div>
          {conflictError && onArchiveConflictGoal && (
            <button
              type="button"
              onClick={onArchiveConflictGoal}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors min-h-[44px]"
            >
              Archive Existing Goal & Retry
            </button>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={Boolean(validation.errors) || isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-ink font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {isSubmitting ? (
            <span>Saving Goal...</span>
          ) : (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Set Goal</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
