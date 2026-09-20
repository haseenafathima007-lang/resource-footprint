import { useState, useEffect, useCallback } from 'react';
import type { BaselineProfile, FactorSetPayload } from '@/engine';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import { factorRepository } from '@/services/supabase/factorRepository.ts';
import bundledFactors from '@/data/factors.v1.json';

export interface ResolvedHistoryEntry {
  baseline: BaselineProfile;
  factors: FactorSetPayload | null;
  status: 'resolved' | 'unavailable';
}

export interface UseBaselineReturn {
  loading: boolean;
  error: string | null;
  currentBaseline: BaselineProfile | null;
  currentFactors: FactorSetPayload | null;
  history: ResolvedHistoryEntry[];
  reload: () => Promise<void>;
}

export function useBaseline(): UseBaselineReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBaseline, setCurrentBaseline] = useState<BaselineProfile | null>(null);
  const [currentFactors, setCurrentFactors] = useState<FactorSetPayload | null>(null);
  const [history, setHistory] = useState<ResolvedHistoryEntry[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch current baseline and history concurrently
      const [currentRes, historyRes] = await Promise.all([
        baselineRepository.getCurrentBaseline(),
        baselineRepository.getBaselineHistory(),
      ]);

      if (!currentRes.ok) {
        setError(currentRes.error.message || 'Failed to load current baseline');
        setLoading(false);
        return;
      }

      if (!historyRes.ok) {
        setError(historyRes.error.message || 'Failed to load baseline history');
        setLoading(false);
        return;
      }

      const activeBaseline = currentRes.data;
      setCurrentBaseline(activeBaseline);

      // 2. Resolve factors for current baseline
      let activeFactors: FactorSetPayload | null = null;
      if (activeBaseline) {
        if (activeBaseline.factorsVersion === bundledFactors.version) {
          activeFactors = bundledFactors as FactorSetPayload;
        } else {
          const factorRes = await factorRepository.getFactorSet(activeBaseline.factorsVersion);
          if (factorRes.ok && factorRes.data.version === activeBaseline.factorsVersion) {
            activeFactors = factorRes.data;
          } else {
            // Factor version could not be resolved
            activeFactors = null;
          }
        }
      }
      setCurrentFactors(activeFactors);

      // 3. Resolve factor sets per historical baseline row
      const historyRows = historyRes.data;
      const resolvedHistory: ResolvedHistoryEntry[] = await Promise.all(
        historyRows.map(async (row) => {
          if (row.factorsVersion === bundledFactors.version) {
            return {
              baseline: row,
              factors: bundledFactors as FactorSetPayload,
              status: 'resolved',
            };
          }

          const factorRes = await factorRepository.getFactorSet(row.factorsVersion);
          if (factorRes.ok && factorRes.data.version === row.factorsVersion) {
            return {
              baseline: row,
              factors: factorRes.data,
              status: 'resolved',
            };
          }

          return {
            baseline: row,
            factors: null,
            status: 'unavailable',
          };
        })
      );

      setHistory(resolvedHistory);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred loading your baseline data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    error,
    currentBaseline,
    currentFactors,
    history,
    reload: loadData,
  };
}
