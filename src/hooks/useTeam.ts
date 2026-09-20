import { useState, useEffect, useCallback } from 'react';
import type {
  TeamMember,
  TeamSummary,
  LeaderboardEntry,
  MyTeam,
  UpdateTeamSettingsInput,
} from '@/services/types.ts';
import { teamRepository } from '@/services/supabase/teamRepository.ts';

export function useTeam(teamId: string) {

  const [team, setTeam] = useState<MyTeam | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeamData = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [myTeamsRes, summaryRes, membersRes, leaderboardRes] = await Promise.all([
        teamRepository.getMyTeams(),
        teamRepository.getTeamSummary(teamId),
        teamRepository.getTeamMembers(teamId),
        teamRepository.getLeaderboard(teamId),
      ]);

      if (!summaryRes.ok) {
        setError(summaryRes.error.message);
        setIsLoading(false);
        return;
      }

      setSummary(summaryRes.data);

      if (myTeamsRes.ok) {
        const found = myTeamsRes.data.find((t) => t.id === teamId) || null;
        setTeam(found);
      }

      if (membersRes.ok) {
        setMembers(membersRes.data);
      }

      if (leaderboardRes.ok) {
        setLeaderboard(leaderboardRes.data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load team details');
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const updateMembership = useCallback(
    async (alias: string, sharing: boolean) => {
      const res = await teamRepository.updateMembership({ teamId, alias, sharing });
      if (res.ok) {
        await loadTeamData();
        return { ok: true as const };
      }
      return { ok: false as const, error: res.error };
    },
    [teamId, loadTeamData]
  );

  const updateSettings = useCallback(
    async (input: Omit<UpdateTeamSettingsInput, 'teamId'>) => {
      const res = await teamRepository.updateTeamSettings({ teamId, ...input });
      if (res.ok) {
        await loadTeamData();
        return { ok: true as const };
      }
      return { ok: false as const, error: res.error };
    },
    [teamId, loadTeamData]
  );

  const rotateCode = useCallback(async () => {
    const res = await teamRepository.rotateCode(teamId);
    if (res.ok) {
      await loadTeamData();
      return { ok: true as const, joinCode: res.data };
    }
    return { ok: false as const, error: res.error };
  }, [teamId, loadTeamData]);

  const removeMember = useCallback(
    async (memberId: string) => {
      const res = await teamRepository.removeMember(teamId, memberId);
      if (res.ok) {
        await loadTeamData();
        return { ok: true as const };
      }
      return { ok: false as const, error: res.error };
    },
    [teamId, loadTeamData]
  );

  const leaveTeam = useCallback(async () => {
    const res = await teamRepository.leaveTeam(teamId);
    if (res.ok) {
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  }, [teamId]);

  const deleteTeam = useCallback(async () => {
    const res = await teamRepository.deleteTeam(teamId);
    if (res.ok) {
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  }, [teamId]);

  return {
    team,
    summary,
    members,
    leaderboard,
    isLoading,
    error,
    reload: loadTeamData,
    updateMembership,
    updateSettings,
    rotateCode,
    removeMember,
    leaveTeam,
    deleteTeam,
  };
}
