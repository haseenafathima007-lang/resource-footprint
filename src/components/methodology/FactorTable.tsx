import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, AlertCircle } from 'lucide-react';
import type { FactorSetPayload, Factor } from '@/engine';
import bundledFactors from '@/data/factors.v1.json';

interface FactorTableProps {
  factorSet?: FactorSetPayload;
}

export const FactorTable: React.FC<FactorTableProps> = ({
  factorSet = bundledFactors as FactorSetPayload,
}) => {
  const [search, setSearch] = useState('');

  const filteredFactors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return factorSet.factors;

    return factorSet.factors.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.source.toLowerCase().includes(q) ||
        f.unit.toLowerCase().includes(q)
    );
  }, [factorSet, search]);

  return (
    <div className="space-y-4">
      {/* Table search & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <label htmlFor="factor-search-input" className="sr-only">
            Search conversion factors
          </label>
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            id="factor-search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search factors by id, activity, or source..."
            className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-border bg-surface text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-muted shrink-0">
          <span className="font-semibold text-ink px-2.5 py-1 rounded-md bg-surface-subtle border border-border">
            Version {factorSet.version} ({factorSet.region})
          </span>
          <span>{filteredFactors.length} of {factorSet.factors.length} factors</span>
        </div>
      </div>

      {/* Responsive Factors Table */}
      <div className="border border-border rounded-xl bg-surface overflow-x-auto">
        <table className="w-full text-left text-xs text-ink">
          <thead className="bg-surface-subtle border-b border-border text-ink-muted">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Factor ID</th>
              <th className="py-2.5 px-3 font-semibold">Activity & Parameter</th>
              <th className="py-2.5 px-3 font-semibold">Unit</th>
              <th className="py-2.5 px-3 font-semibold">Typical (Low – High)</th>
              <th className="py-2.5 px-3 font-semibold">Source & Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredFactors.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-ink-muted">
                  No conversion factors match your search criteria.
                </td>
              </tr>
            ) : (
              filteredFactors.map((f: Factor & { verified?: boolean }) => {
                const isVerified = f.verified === true;
                return (
                  <tr key={f.id} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                      {f.id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-ink">
                      {f.label}
                    </td>
                    <td className="py-2.5 px-3 text-ink-muted whitespace-nowrap">
                      {f.unit}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-ink whitespace-nowrap">
                      {f.typical} <span className="font-normal text-ink-muted text-[11px]">({f.low} – {f.high})</span>
                    </td>
                    <td className="py-2.5 px-3 text-ink-muted max-w-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate" title={f.source}>{f.source}</span>
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded shrink-0">
                            <ShieldCheck className="w-3 h-3" /> verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted bg-surface-subtle border border-border rounded shrink-0">
                            <AlertCircle className="w-3 h-3" /> unverified
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
