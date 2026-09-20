import React from 'react';
import type { BreakdownItem } from '@/lib/dashboardModel.ts';
import type { Period } from '@/engine';
import { formatTypicalValue, formatRange } from '@/lib/format.ts';

interface ChartTableProps {
  breakdown: BreakdownItem[];
  period: Period;
}

export const ChartTable: React.FC<ChartTableProps> = ({ breakdown, period }) => {
  const periodLabel =
    period === 'day'
      ? 'day'
      : period === 'week'
      ? 'week'
      : period === 'month'
      ? 'month'
      : 'year';

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-left text-xs sm:text-sm border-collapse"
        aria-label={`Detailed consumption breakdown table per ${periodLabel}`}
      >
        <thead>
          <tr className="border-b border-border text-ink-muted">
            <th scope="col" className="py-2.5 px-3 font-semibold">Category</th>
            <th scope="col" className="py-2.5 px-3 font-semibold text-right">Typical Water (L)</th>
            <th scope="col" className="py-2.5 px-3 font-semibold text-right">Water Range</th>
            <th scope="col" className="py-2.5 px-3 font-semibold text-right">Typical Energy (kWh)</th>
            <th scope="col" className="py-2.5 px-3 font-semibold text-right">Energy Range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {breakdown.map((item) => (
            <tr key={item.id} className="hover:bg-surface-subtle/50 transition-colors">
              <th scope="row" className="py-3 px-3 font-medium text-ink">
                {item.label}
              </th>
              <td className="py-3 px-3 text-right font-mono text-ink">
                {item.water.typical > 0 ? `~${formatTypicalValue(item.water.typical)}` : '0'}
              </td>
              <td className="py-3 px-3 text-right text-ink-muted text-xs">
                {item.water.typical > 0 ? formatRange(item.water.low, item.water.high, 'L') : '—'}
              </td>
              <td className="py-3 px-3 text-right font-mono text-ink">
                {item.energy.typical > 0 ? `~${formatTypicalValue(item.energy.typical)}` : '0'}
              </td>
              <td className="py-3 px-3 text-right text-ink-muted text-xs">
                {item.energy.typical > 0 ? formatRange(item.energy.low, item.energy.high, 'kWh') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
