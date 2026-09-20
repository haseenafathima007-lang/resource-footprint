import { useState, useEffect, useCallback } from 'react';
import type { Deviation } from '@/engine';
import { deviationRepository } from '@/services/supabase/deviationRepository.ts';

export interface UseDeviationsReturn {
  loading: boolean;
  error: string | null;
  deviations: Deviation[];
  reload: () => Promise<void>;
  addDeviations: (
    items: Omit<Deviation, 'id' | 'createdAt'>[]
  ) => Promise<{ ok: true; data: Deviation[] } | { ok: false; error: Error }>;
  removeDeviation: (id: string) => Promise<{ ok: true } | { ok: false; error: Error }>;
  removeGroup: (groupId: string) => Promise<{ ok: true } | { ok: false; error: Error }>;
}

export function useDeviations(): UseDeviationsReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviations, setDeviations] = useState<Deviation[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await deviationRepository.list();
      if (!res.ok) {
        setError(res.error.message || 'Failed to load deviations');
        setLoading(false);
        return;
      }
      setDeviations(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred loading deviations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addDeviations = useCallback(
    async (items: Omit<Deviation, 'id' | 'createdAt'>[]) => {
      try {
        const res = await deviationRepository.addMany(items);
        if (res.ok) {
          await loadData();
          return { ok: true as const, data: res.data };
        }
        return { ok: false as const, error: new Error(res.error.message) };
      } catch (e: unknown) {
        return {
          ok: false as const,
          error: e instanceof Error ? e : new Error('Failed to add deviations'),
        };
      }
    },
    [loadData]
  );

  const removeDeviation = useCallback(
    async (id: string) => {
      try {
        const res = await deviationRepository.remove(id);
        if (res.ok) {
          await loadData();
          return { ok: true as const };
        }
        return { ok: false as const, error: new Error(res.error.message) };
      } catch (e: unknown) {
        return {
          ok: false as const,
          error: e instanceof Error ? e : new Error('Failed to delete deviation'),
        };
      }
    },
    [loadData]
  );

  const removeGroup = useCallback(
    async (groupId: string) => {
      try {
        const res = await deviationRepository.removeGroup(groupId);
        if (res.ok) {
          await loadData();
          return { ok: true as const };
        }
        return { ok: false as const, error: new Error(res.error.message) };
      } catch (e: unknown) {
        return {
          ok: false as const,
          error: e instanceof Error ? e : new Error('Failed to delete deviation group'),
        };
      }
    },
    [loadData]
  );

  return {
    loading,
    error,
    deviations,
    reload: loadData,
    addDeviations,
    removeDeviation,
    removeGroup,
  };
}
