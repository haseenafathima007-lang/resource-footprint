import React, { useMemo } from 'react';
import { Droplets, Zap, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { BaselineProfile, FactorSetPayload } from '@/engine';
import type { Deviation } from '@/types/deviation.ts';
import { calculateWindow } from '@/engine';
import { formatNumber, formatRange } from '@/lib/format.ts';

interface ImpactPreviewProps {
  baseline: BaselineProfile;
  factors: FactorSetPayload;
  deviations: Omit<Deviation, 'id' | 'createdAt'>[];
  startDate: string;
  endDate: string;
}

export const ImpactPreview: React.FC<ImpactPreviewProps> = ({
  baseline,
  factors,
  deviations,
  startDate,
  endDate,
}) => {
  const result = useMemo(() => {
    try {
      if (!startDate || !endDate || startDate > endDate) {
        return null;
      }
      return calculateWindow({
        history: [baseline],
        deviations: deviations as Deviation[],
        factorsByVersion: {
          [baseline.factorsVersion]: factors,
        },
        startDate,
        endDate,
      });
    } catch {
      return null;
    }
  }, [baseline, factors, deviations, startDate, endDate]);

  if (!result || result.days.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border bg-surface-subtle text-center text-sm text-ink-muted">
        Select a valid date range to preview projected impact.
      </div>
    );
  }

  const { totals, days } = result;
  const dayCount = days.length;
  const { baseline: baselineTotal, actual: actualTotal, difference } = totals;

  const renderDelta = (
    val: number,
    unit: string,
    low: number,
    high: number,
    baseVal: number
  ) => {
    const isZero = Math.abs(val) < 0.001;
    const isIncrease = val > 0;
    const percentDiff = baseVal > 0 ? (val / baseVal) * 100 : 0;

    let colorClass = 'text-ink-muted';
    let bgClass = 'bg-surface-subtle';
    let Icon = Minus;

    if (isIncrease) {
      colorClass = 'text-rose-600 dark:text-rose-400';
      bgClass = 'bg-rose-500/10';
      Icon = ArrowUpRight;
    } else if (!isZero) {
      colorClass = 'text-emerald-600 dark:text-emerald-400';
      bgClass = 'bg-emerald-500/10';
      Icon = ArrowDownRight;
    }

    const sign = isIncrease ? '+' : '';

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs ${bgClass} ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {sign}{formatNumber(val)} {unit} ({sign}{formatNumber(percentDiff)}%)
          </span>
        </div>
        <span className="text-xs text-ink-muted">
          Range: {formatRange(low, high, unit)}
        </span>
      </div>
    );
  };

  return (
    <section aria-labelledby="preview-impact-heading" className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border">
        <div>
          <h3 id="preview-impact-heading" className="font-semibold text-ink text-sm sm:text-base">
            Estimated Impact
          </h3>
          <p className="text-xs text-ink-muted">
            Over {dayCount} {dayCount === 1 ? 'day' : 'days'} ({startDate} to {endDate})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Water Impact Card */}
        <div className="p-3.5 rounded-lg bg-surface border border-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-water font-medium text-xs sm:text-sm">
              <Droplets className="w-4 h-4" aria-hidden="true" />
              <span>Water</span>
            </div>
            <span className="text-xs text-ink-muted">
              Baseline: {formatNumber(baselineTotal.water.typical)} L
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <div className="text-xs text-ink-muted">Projected Actual</div>
              <div className="text-lg font-bold text-ink">
                {formatNumber(actualTotal.water.typical)} <span className="text-xs font-normal text-ink-muted">L</span>
              </div>
            </div>
            {renderDelta(
              difference.water.typical,
              'L',
              difference.water.low,
              difference.water.high,
              baselineTotal.water.typical
            )}
          </div>
        </div>

        {/* Energy Impact Card */}
        <div className="p-3.5 rounded-lg bg-surface border border-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-energy font-medium text-xs sm:text-sm">
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>Energy</span>
            </div>
            <span className="text-xs text-ink-muted">
              Baseline: {formatNumber(baselineTotal.energy.typical)} kWh
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <div className="text-xs text-ink-muted">Projected Actual</div>
              <div className="text-lg font-bold text-ink">
                {formatNumber(actualTotal.energy.typical)} <span className="text-xs font-normal text-ink-muted">kWh</span>
              </div>
            </div>
            {renderDelta(
              difference.energy.typical,
              'kWh',
              difference.energy.low,
              difference.energy.high,
              baselineTotal.energy.typical
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
