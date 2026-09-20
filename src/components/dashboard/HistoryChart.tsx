import React, { useMemo, useState, useEffect } from 'react';
import type { ResolvedHistoryEntry } from '@/hooks/useBaseline.ts';
import { calculateProfile } from '@/engine';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { History, AlertCircle } from 'lucide-react';
import { formatTypicalValue } from '@/lib/format.ts';

interface HistoryChartProps {
  history: ResolvedHistoryEntry[];
}

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return prefersReduced;
}

export const HistoryChart: React.FC<HistoryChartProps> = ({ history }) => {
  const prefersReduced = usePrefersReducedMotion();

  // Sort ascending by effectiveFrom date for chronological timeline - call hook unconditionally before returns
  const chartData = useMemo(() => {
    if (history.length < 2) return [];

    const sorted = [...history].sort(
      (a, b) => new Date(a.baseline.effectiveFrom).getTime() - new Date(b.baseline.effectiveFrom).getTime()
    );

    return sorted.map((entry) => {
      const dateLabel = entry.baseline.effectiveFrom;

      if (entry.status === 'unavailable' || !entry.factors) {
        return {
          date: dateLabel,
          water: null,
          energy: null,
          unavailable: true,
        };
      }

      const daily = calculateProfile(entry.baseline, entry.factors);
      return {
        date: dateLabel,
        water: daily.water.typical,
        energy: daily.energy.typical,
        unavailable: false,
      };
    });
  }, [history]);

  // If fewer than 2 baseline entries, show empty state
  if (history.length < 2) {
    return (
      <div className="p-6 sm:p-8 bg-surface-raised border border-border rounded-2xl shadow-sm text-center">
        <div className="w-10 h-10 rounded-xl bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-3">
          <History className="w-5 h-5" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-ink">Baseline History</h3>
        <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">
          Your history will build up as you update your baseline. Check back after logging seasonal habit adjustments.
        </p>
      </div>
    );
  }

  const hasUnavailable = chartData.some((d) => d.unavailable);

  return (
    <div className="p-5 sm:p-6 bg-surface-raised border border-border rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink">Baseline History Trend</h2>
          <p className="text-xs text-ink-muted">
            Daily typical consumption over time ({history.length} baseline updates)
          </p>
        </div>

        {hasUnavailable && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-energy/10 text-energy text-xs rounded-lg border border-energy/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Some historical factor versions could not be resolved</span>
          </div>
        )}
      </div>

      <div className="w-full h-64 min-h-[256px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--color-water))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--color-water))" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--color-energy))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--color-energy))" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              stroke="hsl(var(--color-text-muted))"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              yAxisId="water"
              orientation="left"
              stroke="hsl(var(--color-water))"
              fontSize={11}
              tickLine={false}
              unit=" L"
            />
            <YAxis
              yAxisId="energy"
              orientation="right"
              stroke="hsl(var(--color-energy))"
              fontSize={11}
              tickLine={false}
              unit=" kWh"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0]?.payload;
                if (item?.unavailable) {
                  return (
                    <div className="p-3 bg-surface-raised border border-border rounded-xl shadow-lg text-xs">
                      <p className="font-semibold text-ink">{label}</p>
                      <p className="text-negative mt-1">Factors version unavailable for this date.</p>
                    </div>
                  );
                }
                return (
                  <div className="p-3 bg-surface-raised border border-border rounded-xl shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-ink">{label}</p>
                    <p className="text-water">
                      Daily Water: <strong>~{item?.water != null ? formatTypicalValue(item.water) : '—'} L</strong>
                    </p>
                    <p className="text-energy">
                      Daily Energy: <strong>~{item?.energy != null ? formatTypicalValue(item.energy) : '—'} kWh</strong>
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs font-medium text-ink capitalize">{value}</span>
              )}
            />
            <Area
              yAxisId="water"
              type="stepAfter"
              dataKey="water"
              name="Daily Water (L)"
              stroke="hsl(var(--color-water))"
              fillOpacity={1}
              fill="url(#waterGradient)"
              isAnimationActive={!prefersReduced}
              connectNulls={false}
            />
            <Area
              yAxisId="energy"
              type="stepAfter"
              dataKey="energy"
              name="Daily Energy (kWh)"
              stroke="hsl(var(--color-energy))"
              fillOpacity={1}
              fill="url(#energyGradient)"
              isAnimationActive={!prefersReduced}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
