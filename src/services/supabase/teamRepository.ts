import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { supabase as defaultClient } from '../supabaseClient.ts';
import type {
  ITeamRepository,
  MyTeam,
  TeamMember,
  TeamSummary,
  LeaderboardEntry,
  CreateTeamInput,
  JoinTeamInput,
  UpdateMembershipInput,
  UpdateTeamSettingsInput,
  ContributionPayloadRow,
  Result,
  ServiceError,
} from '../types.ts';
import { ok, err } from '../types.ts';
import {
  mapRpcMyTeamToMyTeam,
  mapRpcTeamMemberToTeamMember,
  mapRpcTeamSummaryToTeamSummary,
  mapRpcLeaderboardEntryToLeaderboardEntry,
} from '../mappers.ts';

function mapRpcError(error: { message?: string; details?: string }): ServiceError {
  const msg = error.message || '';
  if (msg.includes('UNAUTHENTICATED')) {
    return { code: 'UNAUTHENTICATED', message: 'You must be logged in to access team features.' };
  }
  if (msg.includes('INVALID_CODE')) {
    return { code: 'INVALID_CODE', message: 'Invalid join code. Check the code with your team owner and try again.' };
  }
  if (msg.includes('NOT_FOUND')) {
    return { code: 'NOT_FOUND', message: 'Team or member not found.' };
  }
  if (msg.includes('FORBIDDEN')) {
    return { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' };
  }
  if (msg.includes('TEAM_FULL')) {
    return { code: 'TEAM_FULL', message: 'This team has reached its maximum member limit (50 members).' };
  }
  if (msg.includes('LIMIT_REACHED')) {
    return { code: 'LIMIT_REACHED', message: 'You have reached the maximum team limit (5 teams per user).' };
  }
  if (msg.includes('CONFLICT')) {
    return { code: 'CONFLICT', message: 'An alias or member conflict occurred for this team.' };
  }
  if (msg.includes('VALIDATION')) {
    return { code: 'VALIDATION', message: 'Input validation failed.' };
  }
  return { code: 'UNKNOWN', message: 'A database error occurred.', details: error.message };
}

export class SupabaseTeamRepository implements ITeamRepository {
  constructor(private client: SupabaseClient<Database> = defaultClient) {}

  async getMyTeams(): Promise<Result<MyTeam[]>> {
    try {
      const { data, error } = await this.client.rpc('get_my_teams' as any);
      if (error) {
        return err(mapRpcError(error));
      }
      const teams = ((data as unknown as Record<string, unknown>[]) || []).map(mapRpcMyTeamToMyTeam);
      return ok(teams);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to connect to database.', details: e });
    }
  }

  async createTeam(input: CreateTeamInput): Promise<Result<{ id: string; joinCode: string }>> {
    const trimmedName = input.name ? input.name.trim() : '';
    const trimmedAlias = input.alias ? input.alias.trim() : '';

    if (trimmedName.length < 1 || trimmedName.length > 60) {
      return err({ code: 'VALIDATION', message: 'Team name must be between 1 and 60 characters.' });
    }
    if (trimmedAlias.length < 1 || trimmedAlias.length > 30 || trimmedAlias.includes('@')) {
      return err({ code: 'VALIDATION', message: 'Alias must be 1 to 30 characters and cannot contain "@".' });
    }
    if (input.baselineWaterLDay <= 0 || input.baselineEnergyKwhDay <= 0) {
      return err({ code: 'VALIDATION', message: 'Baseline daily totals must be greater than zero.' });
    }
    if (
      (input.targetResource && !input.targetAmount) ||
      (!input.targetResource && input.targetAmount) ||
      (input.targetAmount != null && input.targetAmount <= 0)
    ) {
      return err({ code: 'VALIDATION', message: 'Target resource and amount must both be valid or omitted.' });
    }

    try {
      const { data, error } = await this.client.rpc('create_team' as any, {
        p_name: trimmedName,
        p_alias: trimmedAlias,
        p_reference_profile: input.referenceProfile as any,
        p_baseline_water_l_day: input.baselineWaterLDay,
        p_baseline_energy_kwh_day: input.baselineEnergyKwhDay,
        p_target_resource: input.targetResource ?? null,
        p_target_amount: input.targetAmount ?? null,
      });

      if (error) {
        return err(mapRpcError(error));
      }

      const res = data as unknown as { id: string; join_code: string };
      return ok({ id: res.id, joinCode: res.join_code });
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to create team.', details: e });
    }
  }

  async joinTeam(input: JoinTeamInput): Promise<Result<{ teamId: string; name: string }>> {
    const trimmedCode = input.code ? input.code.trim() : '';
    const trimmedAlias = input.alias ? input.alias.trim() : '';

    if (!trimmedCode) {
      return err({ code: 'VALIDATION', message: 'Join code is required.' });
    }
    if (trimmedAlias.length < 1 || trimmedAlias.length > 30 || trimmedAlias.includes('@')) {
      return err({ code: 'VALIDATION', message: 'Alias must be 1 to 30 characters and cannot contain "@".' });
    }
    if (input.baselineWaterLDay <= 0 || input.baselineEnergyKwhDay <= 0) {
      return err({ code: 'VALIDATION', message: 'Baseline daily totals must be greater than zero.' });
    }

    try {
      const { data, error } = await this.client.rpc('join_team' as any, {
        p_code: trimmedCode,
        p_alias: trimmedAlias,
        p_reference_profile: input.referenceProfile as any,
        p_baseline_water_l_day: input.baselineWaterLDay,
        p_baseline_energy_kwh_day: input.baselineEnergyKwhDay,
      });

      if (error) {
        return err(mapRpcError(error));
      }

      const res = data as unknown as { team_id: string; name: string };
      return ok({ teamId: res.team_id, name: res.name });
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to join team.', details: e });
    }
  }

  async leaveTeam(teamId: string): Promise<Result<void>> {
    try {
      const { error } = await this.client.rpc('leave_team' as any, { p_team_id: teamId });
      if (error) {
        return err(mapRpcError(error));
      }
      return ok(undefined);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to leave team.', details: e });
    }
  }

  async deleteTeam(teamId: string): Promise<Result<void>> {
    try {
      const { error } = await this.client.rpc('delete_team' as any, { p_team_id: teamId });
      if (error) {
        return err(mapRpcError(error));
      }
      return ok(undefined);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to delete team.', details: e });
    }
  }

  async removeMember(teamId: string, memberId: string): Promise<Result<void>> {
    try {
      const { error } = await this.client.rpc('remove_member' as any, {
        p_team_id: teamId,
        p_member_id: memberId,
      });
      if (error) {
        return err(mapRpcError(error));
      }
      return ok(undefined);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to remove member.', details: e });
    }
  }

  async rotateCode(teamId: string): Promise<Result<string>> {
    try {
      const { data, error } = await this.client.rpc('rotate_code' as any, { p_team_id: teamId });
      if (error) {
        return err(mapRpcError(error));
      }
      return ok(String(data));
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to rotate join code.', details: e });
    }
  }

  async updateMembership(input: UpdateMembershipInput): Promise<Result<void>> {
    const trimmedAlias = input.alias ? input.alias.trim() : '';
    if (trimmedAlias.length < 1 || trimmedAlias.length > 30 || trimmedAlias.includes('@')) {
      return err({ code: 'VALIDATION', message: 'Alias must be 1 to 30 characters and cannot contain "@".' });
    }

    try {
      const { error } = await this.client.rpc('update_my_membership' as any, {
        p_team_id: input.teamId,
        p_alias: trimmedAlias,
        p_sharing: input.sharing,
      });
      if (error) {
        return err(mapRpcError(error));
      }
      return ok(undefined);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to update membership.', details: e });
    }
  }

  async updateTeamSettings(input: UpdateTeamSettingsInput): Promise<Result<void>> {
    if (
      (input.targetResource && !input.targetAmount) ||
      (!input.targetResource && input.targetAmount) ||
      (input.targetAmount != null && input.targetAmount <= 0)
    ) {
      return err({ code: 'VALIDATION', message: 'Target resource and amount must both be valid or omitted.' });
    }

    try {
      const { error } = await this.client.rpc('update_team_settings' as any, {
        p_team_id: input.teamId,
        p_show_leaderboard: input.showLeaderboard,
        p_target_resource: input.targetResource ?? null,
        p_target_amount: input.targetAmount ?? null,
      });
      if (error) {
        return err(mapRpcError(error));
      }
      return ok(undefined);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to update team settings.', details: e });
    }
  }

  async upsertMyContributions(teamId: string, rows: ContributionPayloadRow[]): Promise<Result<void>> {
    if (rows.length > 40) {
      return err({ code: 'VALIDATION', message: 'Cannot upload more than 40 contribution rows in a single update.' });
    }

    try {
      const { error } = await this.client.rpc('upsert_my_contributions' as any, {
        p_team_id: teamId,
        p_rows: rows as any,
      });
      if (error) {
        return err(mapRpcError(error));
      }
      return ok(undefined);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to upload contributions.', details: e });
    }
  }

  async getTeamMembers(teamId: string): Promise<Result<TeamMember[]>> {
    try {
      const { data, error } = await this.client.rpc('get_team_members' as any, { p_team_id: teamId });
      if (error) {
        return err(mapRpcError(error));
      }
      const members = ((data as unknown as Record<string, unknown>[]) || []).map(mapRpcTeamMemberToTeamMember);
      return ok(members);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to fetch team members.', details: e });
    }
  }

  async getTeamSummary(teamId: string): Promise<Result<TeamSummary>> {
    try {
      const { data, error } = await this.client.rpc('get_team_summary' as any, { p_team_id: teamId });
      if (error) {
        return err(mapRpcError(error));
      }
      const summary = mapRpcTeamSummaryToTeamSummary(data as unknown as Record<string, unknown>);
      return ok(summary);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to fetch team summary.', details: e });
    }
  }

  async getLeaderboard(teamId: string): Promise<Result<LeaderboardEntry[]>> {
    try {
      const { data, error } = await this.client.rpc('get_leaderboard' as any, { p_team_id: teamId });
      if (error) {
        return err(mapRpcError(error));
      }
      const entries = ((data as unknown as Record<string, unknown>[]) || []).map(mapRpcLeaderboardEntryToLeaderboardEntry);
      return ok(entries);
    } catch (e: unknown) {
      return err({ code: 'NETWORK', message: 'Failed to fetch leaderboard.', details: e });
    }
  }
}

export const teamRepository = new SupabaseTeamRepository();
