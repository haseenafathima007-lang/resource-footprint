import { useEffect, useRef } from 'react';
import type { BaselineProfile } from '@/types/profile.ts';
import type { Deviation } from '@/types/deviation.ts';
import type { FactorSetPayload, Factor } from '@/types/factor.ts';
import {
  memberDailySavings,
  contributionRows,
  addDays,
  type FactorsMap,
} from '@/engine';
import { teamRepository } from '@/services/supabase/teamRepository.ts';
import { factorRepository } from '@/services/supabase/factorRepository.ts';
import { useToday, type ClockFunction } from './useToday.ts';

import type { ResolvedHistoryEntry } from './useBaseline.ts';

interface UseTeamSyncParams {
  teamId: string;
  sharing: boolean;
  snapshot: BaselineProfile | null;
  history: ResolvedHistoryEntry[];
  deviations?: Deviation[];
  clock?: ClockFunction;
  onSyncComplete?: () => void;
}

export function useTeamSync({
  teamId,
  sharing,
  snapshot,
  history,
  deviations = [],
  clock,
  onSyncComplete,
}: UseTeamSyncParams) {
  const today = useToday(clock);
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!teamId || !sharing || !snapshot) {
      return;
    }

    // Sync key prevents duplicate calls in StrictMode
    const syncKey = `${teamId}_${sharing}_${today.today}_${snapshot.effectiveFrom}`;
    if (syncedRef.current === syncKey) {
      return;
    }

    syncedRef.current = syncKey;

    async function performSync() {
      try {
        const endDate = today.today;
        const startDate = addDays(endDate, -29);

        const baselineHistory = history.map((h) => h.baseline);
        // Collect all factor versions needed
        const referencedVersions = new Set<string>();
        if (snapshot) referencedVersions.add(snapshot.factorsVersion);
        baselineHistory.forEach((b) => referencedVersions.add(b.factorsVersion));

        const factorsByVersion: Record<string, FactorsMap | FactorSetPayload | Factor[]> = {};

        await Promise.all(
          Array.from(referencedVersions).map(async (v) => {
            const res = await factorRepository.getFactorSet(v);
            if (res.ok) {
              factorsByVersion[v] = res.data;
            }
          })
        );

        const savingsRes = memberDailySavings({
          snapshot: snapshot!,
          history: baselineHistory.length > 0 ? baselineHistory : [snapshot!],
          deviations,
          factorsByVersion,
          startDate,
          endDate,
        });

        const rows = contributionRows(savingsRes.days);
        if (rows.length > 0) {
          const syncRes = await teamRepository.upsertMyContributions(teamId, rows);
          if (syncRes.ok && onSyncComplete) {
            onSyncComplete();
          }
        }
      } catch (err: unknown) {
        // Graceful error handling: sync errors fail silently without crashing page
        console.warn('Team contribution sync notice:', err);
      }
    }

    performSync();
  }, [teamId, sharing, snapshot, history, deviations, today.today, onSyncComplete]);
}
