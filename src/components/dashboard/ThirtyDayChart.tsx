import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Calendar,
  Info,
  Table as TableIcon,
  BarChart2,
  CalendarPlus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import type { Dashboard30DayModel } from '@/lib/dashboardModel.ts';
import { formatNumber } from '@/lib/format.ts';

interface ThirtyDayChartProps {
  model: Dashboard30DayModel;
}

export const ThirtyDayChart: React.FC<ThirtyDayChartProps> = ({ model }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [metricTab, setMetricTab] = useState<'water' | 'energy'>('water');

  const {
    days,
    totals,
    activeDeviations,
    earliestBaselineProjectedBackwards,
    earliestBaselineDate,
    startDate,
    endDate,
  } = model;

  const chartData = useMemo(() => {
    return days.map((d) => ({
      date: d.date.slice(5), // "MM-DD"
      fullDate: d.date,
      baselineWater: Number(d.baselineTotals.water.typical.toFixed(1)),
      actualWater: Number(d.actualTotals.water.typical.toFixed(1)),
      baselineEnergy: Number(d.baselineTotals.energy.typical.toFixed(2)),
      actualEnergy: Number(d.actualTotals.energy.typical.toFixed(2)),
      waterDiff: Number(d.difference.water.typical.toFixed(1)),
      energyDiff: Number(d.difference.energy.typical.toFixed(2)),
      hasDeviation: d.appliedDeviations.length > 0,
      deviations: d.appliedDeviations,
    }));
  }, [days]);

  const renderDeltaBadge = (diff: number, unit: string) => {
    const isZero = Math.abs(diff) < 0.01;
    const isIncrease = diff > 0;
    const sign = isIncrease ? '+' : '';

    let colorClass = 'text-ink-muted bg-surface-subtle';
    let Icon = Minus;

    if (isIncrease) {
      colorClass = 'text-rose-600 dark:text-rose-400 bg-rose-500/10';
      Icon = ArrowUpRight;
    } else if (!isZero) {
      colorClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
      Icon = ArrowDownRight;
    }

    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-semibold ${colorClass}`}>
        <Icon className="w-3 h-3" aria-hidden="true" />
        {sign}{formatNumber(diff)} {unit}
      </span>
    );
  };

  return (
    <div className="p-5 sm:p-6 bg-surface-raised border border-border rounded-2xl shadow-sm space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">30-Day Activity & Actuals</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {startDate} to {endDate}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Daily baseline vs actual consumption reflecting logged events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Selector */}
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="tablist" aria-label="Metric Selection">
            <button
              type="button"
              role="tab"
              aria-selected={metricTab === 'water'}
              onClick={() => setMetricTab('water')}
              className={`px-3 py-1 text-xs font-semibold rounded-md min-h-[36px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                metricTab === 'water'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Water (L)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={metricTab === 'energy'}
              onClick={() => setMetricTab('energy')}
              className={`px-3 py-1 text-xs font-semibold rounded-md min-h-[36px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                metricTab === 'energy'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Energy (kWh)
            </button>
          </div>

          {/* View Mode Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            aria-label={viewMode === 'chart' ? 'Switch to accessible 30-day table view' : 'Switch to 30-day chart view'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg border border-border bg-surface hover:bg-surface-subtle text-ink text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {viewMode === 'chart' ? (
              <>
                <TableIcon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span className="hidden xs:inline">Table</span>
              </>
            ) : (
              <>
                <BarChart2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span className="hidden xs:inline">Chart</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backward projection note */}
      {earliestBaselineProjectedBackwards && (
        <div
          role="note"
          className="p-3 bg-surface-subtle border border-border rounded-xl text-xs text-ink-muted flex items-start gap-2.5"
        >
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            The last 30 days includes dates before your earliest recorded baseline ({earliestBaselineDate}). Days before that date use your earliest profile as a projection for comparison.
          </p>
        </div>
      )}

      {/* 30-Day Totals Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-muted font-medium">30-Day Total Water</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold text-ink">
                {formatNumber(totals.actual.water.typical)} L
              </span>
              <span className="text-xs text-ink-muted">
                (Baseline: {formatNumber(totals.baseline.water.typical)} L)
              </span>
            </div>
          </div>
          {renderDeltaBadge(totals.difference.water.typical, 'L')}
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-muted font-medium">30-Day Total Energy</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold text-ink">
                {formatNumber(totals.actual.energy.typical)} kWh
              </span>
              <span className="text-xs text-ink-muted">
                (Baseline: {formatNumber(totals.baseline.energy.typical)} kWh)
              </span>
            </div>
          </div>
          {renderDeltaBadge(totals.difference.energy.typical, 'kWh')}
        </div>
      </div>

      {/* Active Changes Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Logged Changes in this 30-day Window
          </span>
          <Link
            to="/log"
            className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
          >
            <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Log a change</span>
          </Link>
        </div>

        {activeDeviations.length === 0 ? (
          <div className="p-3 rounded-lg border border-dashed border-border bg-surface text-center text-xs text-ink-muted">
            No temporary activity changes logged for this 30-day period. Your actual usage matched your baseline.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeDeviations.map((dev) => (
              <span
                key={dev.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 text-xs text-ink"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <strong className="font-semibold text-primary">{dev.note || dev.field}:</strong>
                <span>{dev.startDate} to {dev.endDate}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Visual Presentation: Chart or Table */}
      {viewMode === 'chart' ? (
        <div className="w-full h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actualWaterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--color-water))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--color-water))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="actualEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--color-energy))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--color-energy))" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="date"
                stroke="hsl(var(--color-text-muted))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--color-text-muted))"
                fontSize={11}
                tickLine={false}
                unit={metricTab === 'water' ? ' L' : ' kWh'}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;

                  return (
                    <div className="p-3 bg-surface-raised border border-border rounded-xl shadow-lg text-xs space-y-1.5">
                      <p className="font-semibold text-ink">{item.fullDate}</p>
                      {metricTab === 'water' ? (
                        <>
                          <div className="flex justify-between gap-3 text-ink-muted">
                            <span>Baseline Water:</span>
                            <strong>{item.baselineWater} L</strong>
                          </div>
                          <div className="flex justify-between gap-3 text-water font-semibold">
                            <span>Actual Water:</span>
                            <strong>{item.actualWater} L</strong>
                          </div>
                          <div className="pt-1 border-t border-border">
                            {renderDeltaBadge(item.waterDiff, 'L')}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between gap-3 text-ink-muted">
                            <span>Baseline Energy:</span>
                            <strong>{item.baselineEnergy} kWh</strong>
                          </div>
                          <div className="flex justify-between gap-3 text-energy font-semibold">
                            <span>Actual Energy:</span>
                            <strong>{item.actualEnergy} kWh</strong>
                          </div>
                          <div className="pt-1 border-t border-border">
                            {renderDeltaBadge(item.energyDiff, 'kWh')}
                          </div>
                        </>
                      )}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-medium text-ink">{value}</span>
                )}
              />

              {metricTab === 'water' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="baselineWater"
                    name="Baseline Water (L/day)"
                    stroke="hsl(var(--color-text-muted))"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="actualWater"
                    name="Actual Water (L/day)"
                    stroke="hsl(var(--color-water))"
                    fill="url(#actualWaterGrad)"
                    strokeWidth={2}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="baselineEnergy"
                    name="Baseline Energy (kWh/day)"
                    stroke="hsl(var(--color-text-muted))"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="actualEnergy"
                    name="Actual Energy (kWh/day)"
                    stroke="hsl(var(--color-energy))"
                    fill="url(#actualEnergyGrad)"
                    strokeWidth={2}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Accessible Table View */
        <div className="overflow-x-auto max-h-72 border border-border rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-subtle text-ink-muted sticky top-0 border-b border-border">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Baseline Water</th>
                <th className="px-3 py-2 font-semibold">Actual Water</th>
                <th className="px-3 py-2 font-semibold">Baseline Energy</th>
                <th className="px-3 py-2 font-semibold">Actual Energy</th>
                <th className="px-3 py-2 font-semibold">Deviations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {days.map((d) => (
                <tr key={d.date} className="hover:bg-surface-subtle/50">
                  <td className="px-3 py-2 font-medium text-ink">{d.date}</td>
                  <td className="px-3 py-2 text-ink-muted">
                    {formatNumber(d.baselineTotals.water.typical)} L
                  </td>
                  <td className="px-3 py-2 font-semibold text-water">
                    {formatNumber(d.actualTotals.water.typical)} L
                  </td>
                  <td className="px-3 py-2 text-ink-muted">
                    {formatNumber(d.baselineTotals.energy.typical)} kWh
                  </td>
                  <td className="px-3 py-2 font-semibold text-energy">
                    {formatNumber(d.actualTotals.energy.typical)} kWh
                  </td>
                  <td className="px-3 py-2 text-ink-muted">
                    {d.appliedDeviations.length > 0
                      ? `${d.appliedDeviations.length} logged`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
