import React from 'react';
import type { ActivityResult, Period } from '@/engine';
import { formatTypicalValue, formatRange } from '@/lib/format.ts';
import { Droplets, Zap } from 'lucide-react';

interface SummaryCardsProps {
  totals: ActivityResult;
  period: Period;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ totals, period }) => {
  const periodUnit =
    period === 'day'
      ? 'day'
      : period === 'week'
      ? 'week'
      : period === 'month'
      ? 'month'
      : 'year';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {/* Total Water Card */}
      <div className="p-5 rounded-2xl border border-water/30 bg-water-bg/30 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-water flex items-center gap-1.5">
              <Droplets className="w-4 h-4" aria-hidden="true" />
              Total Water Footprint
            </span>
            <span className="text-xs text-ink-muted capitalize">Per {periodUnit}</span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
              ~{formatTypicalValue(totals.water.typical)}
            </span>
            <span className="text-base font-semibold text-ink-muted">L / {periodUnit}</span>
          </div>

          <p className="text-xs text-ink-muted mt-1.5">
            Estimated range:{' '}
            <strong className="text-ink font-medium">
              {formatRange(totals.water.low, totals.water.high, 'L')}
            </strong>
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-ink-muted">
          <span>Personal & household water share</span>
          <span className="text-water font-medium">Outward-rounded</span>
        </div>
      </div>

      {/* Total Energy Card */}
      <div className="p-5 rounded-2xl border border-energy/30 bg-energy-bg/30 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-energy flex items-center gap-1.5">
              <Zap className="w-4 h-4" aria-hidden="true" />
              Total Energy Footprint
            </span>
            <span className="text-xs text-ink-muted capitalize">Per {periodUnit}</span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
              ~{formatTypicalValue(totals.energy.typical)}
            </span>
            <span className="text-base font-semibold text-ink-muted">kWh / {periodUnit}</span>
          </div>

          <p className="text-xs text-ink-muted mt-1.5">
            Estimated range:{' '}
            <strong className="text-ink font-medium">
              {formatRange(totals.energy.low, totals.energy.high, 'kWh')}
            </strong>
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-ink-muted">
          <span>Water heating, cooling & appliances</span>
          <span className="text-energy font-medium">Outward-rounded</span>
        </div>
      </div>
    </div>
  );
};
