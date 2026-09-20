import { useState, useEffect, useCallback } from 'react';
import type { MyTeam, CreateTeamInput, JoinTeamInput } from '@/services/types.ts';
import { teamRepository } from '@/services/supabase/teamRepository.ts';

export function useTeams() {
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await teamRepository.getMyTeams();
      if (res.ok) {
        setTeams(res.data);
      } else {
        setError(res.error.message);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const createTeam = useCallback(
    async (input: CreateTeamInput) => {
      const res = await teamRepository.createTeam(input);
      if (res.ok) {
        await loadTeams();
        return { ok: true as const, data: res.data };
      }
      return { ok: false as const, error: res.error };
    },
    [loadTeams]
  );

  const joinTeam = useCallback(
    async (input: JoinTeamInput) => {
      const res = await teamRepository.joinTeam(input);
      if (res.ok) {
        await loadTeams();
        return { ok: true as const, data: res.data };
      }
      return { ok: false as const, error: res.error };
    },
    [loadTeams]
  );

  return {
    teams,
    isLoading,
    error,
    reload: loadTeams,
    createTeam,
    joinTeam,
  };
}
