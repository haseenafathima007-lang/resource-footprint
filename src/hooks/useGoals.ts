import { useState, useEffect, useCallback } from 'react';
import type { BaselineProfile } from '@/types/profile.ts';
import type { FactorSetPayload, Factor } from '@/types/factor.ts';
import {
  type Goal,
  type GoalInput,
  type GoalProgress,
  goalProgress,
  type FactorsMap,
} from '@/engine';
import { goalRepository } from '@/services/supabase/goalRepository.ts';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import { deviationRepository } from '@/services/supabase/deviationRepository.ts';
import { factorRepository } from '@/services/supabase/factorRepository.ts';
import { useToday, type ClockFunction } from './useToday.ts';

export interface GoalWithProgress {
  goal: Goal;
  progress: GoalProgress;
}

export function useGoals(clock?: ClockFunction) {
  const today = useToday(clock);

  const [activeGoals, setActiveGoals] = useState<GoalWithProgress[]>([]);
  const [archivedGoals, setArchivedGoals] = useState<GoalWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoalsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [goalsRes, historyRes, deviationsRes] = await Promise.all([
        goalRepository.list(),
        baselineRepository.getBaselineHistory(),
        deviationRepository.list(),
      ]);

      if (!goalsRes.ok) {
        setError(goalsRes.error.message);
        setIsLoading(false);
        return;
      }

      const goalsList = goalsRes.data;
      const history = historyRes.ok ? historyRes.data : [];
      const deviations = deviationsRes.ok ? deviationsRes.data : [];

      const referencedVersions = new Set<string>();
      history.forEach((b) => referencedVersions.add(b.factorsVersion));
      goalsList.forEach((g) => referencedVersions.add(g.referenceProfile.factorsVersion));

      const factorsByVersion: Record<string, FactorsMap | FactorSetPayload | Factor[]> = {};

      await Promise.all(
        Array.from(referencedVersions).map(async (v) => {
          const factorRes = await factorRepository.getFactorSet(v);
          if (factorRes.ok) {
            factorsByVersion[v] = factorRes.data;
          }
        })
      );

      const resolvedActive: GoalWithProgress[] = [];
      const resolvedArchived: GoalWithProgress[] = [];

      for (const goal of goalsList) {
        const progress = goalProgress({
          goal,
          history,
          deviations,
          factorsByVersion,
          today: today.today,
        });

        const item = { goal, progress };

        if (goal.status === 'active') {
          resolvedActive.push(item);
        } else {
          resolvedArchived.push(item);
        }
      }

      setActiveGoals(resolvedActive);
      setArchivedGoals(resolvedArchived);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load goals data');
    } finally {
      setIsLoading(false);
    }
  }, [today.today]);

  useEffect(() => {
    loadGoalsData();
  }, [loadGoalsData]);

  const createGoal = useCallback(
    async (
      input: GoalInput,
      referenceProfile: BaselineProfile,
      factors: FactorSetPayload | Factor[]
    ) => {
      try {
        const res = await goalRepository.create(input, referenceProfile, today.today, factors);
        if (res.ok) {
          await loadGoalsData();
          return { ok: true as const, goal: res.data };
        }
        return { ok: false as const, error: res.error };
      } catch (e: unknown) {
        return {
          ok: false as const,
          error: {
            code: 'UNKNOWN' as const,
            message: e instanceof Error ? e.message : 'Failed to create goal',
          },
        };
      }
    },
    [today.today, loadGoalsData]
  );

  const archiveGoal = useCallback(
    async (id: string) => {
      try {
        const res = await goalRepository.archive(id);
        if (res.ok) {
          await loadGoalsData();
          return { ok: true as const };
        }
        return { ok: false as const, error: res.error };
      } catch (e: unknown) {
        return {
          ok: false as const,
          error: {
            code: 'UNKNOWN' as const,
            message: e instanceof Error ? e.message : 'Failed to archive goal',
          },
        };
      }
    },
    [loadGoalsData]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      try {
        const res = await goalRepository.remove(id);
        if (res.ok) {
          await loadGoalsData();
          return { ok: true as const };
        }
        return { ok: false as const, error: res.error };
      } catch (e: unknown) {
        return {
          ok: false as const,
          error: {
            code: 'UNKNOWN' as const,
            message: e instanceof Error ? e.message : 'Failed to delete goal',
          },
        };
      }
    },
    [loadGoalsData]
  );

  return {
    activeGoals,
    archivedGoals,
    isLoading,
    error,
    reload: loadGoalsData,
    createGoal,
    archiveGoal,
    removeGoal,
  };
}
