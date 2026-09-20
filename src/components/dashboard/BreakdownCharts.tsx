import React, { useState, useEffect, useMemo } from 'react';
import type { BreakdownItem } from '@/lib/dashboardModel.ts';
import type { Period } from '@/engine';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Droplets, Zap, Table as TableIcon, BarChart3 } from 'lucide-react';
import { ChartTable } from './ChartTable.tsx';
import { formatTypicalValue, formatRange } from '@/lib/format.ts';

interface BreakdownChartsProps {
  breakdown: BreakdownItem[];
  period: Period;
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

export const BreakdownCharts: React.FC<BreakdownChartsProps> = ({ breakdown, period }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const prefersReduced = usePrefersReducedMotion();

  const periodLabel =
    period === 'day'
      ? 'day'
      : period === 'week'
      ? 'week'
      : period === 'month'
      ? 'month'
      : 'year';

  const waterChartData = useMemo(() => {
    return breakdown.map((item) => ({
      name: item.id === 'shower' ? 'Shower' : item.id === 'cooling' ? 'Cooling' : 'Laundry',
      typical: item.water.typical,
      low: item.water.low,
      high: item.water.high,
      unit: 'L',
    }));
  }, [breakdown]);

  const energyChartData = useMemo(() => {
    return breakdown.map((item) => ({
      name: item.id === 'shower' ? 'Shower' : item.id === 'cooling' ? 'Cooling' : 'Laundry',
      typical: item.energy.typical,
      low: item.energy.low,
      high: item.energy.high,
      unit: 'kWh',
    }));
  }, [breakdown]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Consumption by Activity</h2>
          <p className="text-xs text-ink-muted">
            Independent breakdown for water and energy per {periodLabel}
          </p>
        </div>

        {/* View Toggle: Chart vs Table */}
        <div className="flex items-center gap-1 p-1 bg-surface-subtle border border-border rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            aria-pressed={viewMode === 'chart'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] min-w-[44px] text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              viewMode === 'chart'
                ? 'bg-surface-raised text-primary shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] min-w-[44px] text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              viewMode === 'table'
                ? 'bg-surface-raised text-primary shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="p-4 sm:p-5 bg-surface-raised border border-border rounded-2xl shadow-sm">
          <ChartTable breakdown={breakdown} period={period} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Water Breakdown Chart */}
          <div className="p-4 sm:p-5 bg-surface-raised border border-border rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-water flex items-center gap-1.5">
                <Droplets className="w-4 h-4" aria-hidden="true" />
                Water Breakdown (L)
              </span>
              <span className="text-xs text-ink-muted">Typical values</span>
            </div>

            <div className="w-full h-56 min-h-[224px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={waterChartData}
                  margin={{ top: 20, right: 10, left: -15, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--color-text-muted))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--color-text-muted))"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--color-surface-subtle))', opacity: 0.5 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 bg-surface-raised border border-border rounded-xl shadow-lg text-xs text-ink">
                          <p className="font-semibold text-water">{data.name}</p>
                          <p className="mt-1">
                            Typical: <strong>~{formatTypicalValue(data.typical)} L</strong>
                          </p>
                          <p className="text-ink-muted text-[11px] mt-0.5">
                            Range: {data.typical > 0 ? formatRange(data.low, data.high, 'L') : '0 L'}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="typical"
                    fill="hsl(var(--color-water))"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={!prefersReduced}
                  >
                    <LabelList
                      dataKey="typical"
                      position="top"
                      formatter={(val: unknown) => {
                        const num = Number(val);
                        return num > 0 ? `~${formatTypicalValue(num)} L` : '';
                      }}
                      style={{ fill: 'hsl(var(--color-text))', fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Screen reader accessible fallback table always rendered */}
            <div className="sr-only">
              <ChartTable breakdown={breakdown} period={period} />
            </div>
          </div>

          {/* Energy Breakdown Chart */}
          <div className="p-4 sm:p-5 bg-surface-raised border border-border rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-energy flex items-center gap-1.5">
                <Zap className="w-4 h-4" aria-hidden="true" />
                Energy Breakdown (kWh)
              </span>
              <span className="text-xs text-ink-muted">Typical values</span>
            </div>

            <div className="w-full h-56 min-h-[224px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={energyChartData}
                  margin={{ top: 20, right: 10, left: -15, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--color-text-muted))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--color-text-muted))"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--color-surface-subtle))', opacity: 0.5 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 bg-surface-raised border border-border rounded-xl shadow-lg text-xs text-ink">
                          <p className="font-semibold text-energy">{data.name}</p>
                          <p className="mt-1">
                            Typical: <strong>~{formatTypicalValue(data.typical)} kWh</strong>
                          </p>
                          <p className="text-ink-muted text-[11px] mt-0.5">
                            Range: {data.typical > 0 ? formatRange(data.low, data.high, 'kWh') : '0 kWh'}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="typical"
                    fill="hsl(var(--color-energy))"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={!prefersReduced}
                  >
                    <LabelList
                      dataKey="typical"
                      position="top"
                      formatter={(val: unknown) => {
                        const num = Number(val);
                        return num > 0 ? `~${formatTypicalValue(num)}` : '';
                      }}
                      style={{ fill: 'hsl(var(--color-text))', fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Screen reader accessible fallback table always rendered */}
            <div className="sr-only">
              <ChartTable breakdown={breakdown} period={period} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
