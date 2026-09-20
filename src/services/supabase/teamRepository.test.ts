import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseTeamRepository } from './teamRepository';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('SupabaseTeamRepository', () => {
  let mockClient: any;
  let repo: SupabaseTeamRepository;

  beforeEach(() => {
    mockClient = {
      rpc: vi.fn(),
    };
    repo = new SupabaseTeamRepository(mockClient as unknown as SupabaseClient<any>);
  });

  describe('Client-side Validation Short-Circuit', () => {
    it('returns VALIDATION error for invalid team name without calling DB', async () => {
      const res = await repo.createTeam({
        name: '', // Empty name
        alias: 'Alice',
        referenceProfile: {} as any,
        baselineWaterLDay: 150,
        baselineEnergyKwhDay: 8,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
        expect(res.error.message).toMatch(/Team name/i);
      }
      expect(mockClient.rpc).not.toHaveBeenCalled();
    });

    it('returns VALIDATION error for alias containing @ without calling DB', async () => {
      const res = await repo.createTeam({
        name: 'Eco Warriors',
        alias: 'alice@example.com', // Contains @
        referenceProfile: {} as any,
        baselineWaterLDay: 150,
        baselineEnergyKwhDay: 8,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
        expect(res.error.message).toMatch(/Alias/i);
      }
      expect(mockClient.rpc).not.toHaveBeenCalled();
    });

    it('returns VALIDATION error for invalid baseline daily totals without calling DB', async () => {
      const res = await repo.joinTeam({
        code: '23456789AB',
        alias: 'Bob',
        referenceProfile: {} as any,
        baselineWaterLDay: 0, // <= 0
        baselineEnergyKwhDay: 8,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
      }
      expect(mockClient.rpc).not.toHaveBeenCalled();
    });

    it('returns VALIDATION error for > 40 contribution rows without calling DB', async () => {
      const rows = Array.from({ length: 41 }, (_, i) => ({
        day: `2026-09-${String(i + 1).padStart(2, '0')}`,
        water_saved_l: 10,
        energy_saved_kwh: 1,
      }));

      const res = await repo.upsertMyContributions('team-1', rows);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
      }
      expect(mockClient.rpc).not.toHaveBeenCalled();
    });
  });

  describe('RPC Call and Error Mapping', () => {
    it('maps INVALID_CODE RPC exception to friendly ServiceError', async () => {
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'P0001: INVALID_CODE' },
      });

      const res = await repo.joinTeam({
        code: 'WRONGCODE10',
        alias: 'Bob',
        referenceProfile: {} as any,
        baselineWaterLDay: 150,
        baselineEnergyKwhDay: 8,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('INVALID_CODE');
        expect(res.error.message).toMatch(/Invalid join code/i);
      }
    });

    it('maps TEAM_FULL RPC exception to friendly ServiceError', async () => {
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'P0001: TEAM_FULL' },
      });

      const res = await repo.joinTeam({
        code: '23456789AB',
        alias: 'Bob',
        referenceProfile: {} as any,
        baselineWaterLDay: 150,
        baselineEnergyKwhDay: 8,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('TEAM_FULL');
        expect(res.error.message).toMatch(/maximum member limit/i);
      }
    });

    it('maps LIMIT_REACHED RPC exception to friendly ServiceError', async () => {
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'P0001: LIMIT_REACHED' },
      });

      const res = await repo.createTeam({
        name: 'My 6th Team',
        alias: 'Alice',
        referenceProfile: {} as any,
        baselineWaterLDay: 150,
        baselineEnergyKwhDay: 8,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('LIMIT_REACHED');
      }
    });

    it('maps get_my_teams RPC output to MyTeam objects', async () => {
      mockClient.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 't-1',
            name: 'Eco Warriors',
            role: 'owner',
            alias: 'AliceEco',
            sharing: true,
            member_count: 3,
            target_resource: 'water',
            target_amount: 500,
            show_leaderboard: true,
            created_at: '2026-09-20T00:00:00Z',
            join_code: '23456789AB',
          },
        ],
        error: null,
      });

      const res = await repo.getMyTeams();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBe(1);
        expect(res.data[0].id).toBe('t-1');
        expect(res.data[0].joinCode).toBe('23456789AB');
      }
    });
  });
});
