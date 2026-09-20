import { describe, it, expect } from 'vitest';
import {
  mapDbProfileToProfile,
  mapDbBaselineToBaseline,
  mapBaselineToDbInsert,
  mapDbDeviationToDeviation,
  mapDeviationToDbInsert,
  mapDbFactorSetToFactorSet,
  mapDbGoalToGoal,
  mapGoalToDbInsert,
  mapRpcMyTeamToMyTeam,
  mapRpcTeamMemberToTeamMember,
  mapRpcTeamSummaryToTeamSummary,
  mapRpcLeaderboardEntryToLeaderboardEntry,
  type DbProfileRow,
  type DbBaselineProfileRow,
  type DbDeviationRow,
  type DbFactorSetRow,
  type DbGoalRow,
} from './mappers.ts';
import type { BaselineProfile } from '../types/profile.ts';
import type { Deviation } from '../types/deviation.ts';

describe('Services Mappers (DB snake_case <-> Engine camelCase)', () => {
  describe('Profile Mappers', () => {
    it('maps DbProfileRow to UserProfile', () => {
      const row: DbProfileRow = {
        id: 'user-123',
        display_name: 'Test User',
        created_at: '2026-09-20T00:00:00Z',
        updated_at: '2026-09-20T01:00:00Z',
      };

      const result = mapDbProfileToProfile(row);
      expect(result).toEqual({
        id: 'user-123',
        displayName: 'Test User',
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T01:00:00Z',
      });
    });
  });

  describe('Baseline Profile Mappers', () => {
    const baseline: BaselineProfile = {
      effectiveFrom: '2026-01-01',
      householdSize: 3,
      showerMinutesPerDay: 15,
      showerHeater: 'electric',
      acHoursPerDay: 5,
      fanHoursPerDay: 8,
      laptopHoursPerDay: 7,
      laundryLoadsPerWeek: 4,
      laundryMachine: 'frontLoad',
      factorsVersion: '1.0.0',
    };

    it('maps BaselineProfile to DbBaselineProfileInsert', () => {
      const insert = mapBaselineToDbInsert(baseline, 'user-abc');
      expect(insert).toEqual({
        user_id: 'user-abc',
        effective_from: '2026-01-01',
        household_size: 3,
        shower_minutes_per_day: 15,
        shower_heater: 'electric',
        ac_hours_per_day: 5,
        fan_hours_per_day: 8,
        laptop_hours_per_day: 7,
        laundry_loads_per_week: 4,
        laundry_machine: 'frontLoad',
        factors_version: '1.0.0',
      });
    });

    it('round-trips BaselineProfile through DB row mapping', () => {
      const dbRow: DbBaselineProfileRow = {
        id: 'base-1',
        user_id: 'user-abc',
        effective_from: baseline.effectiveFrom,
        household_size: baseline.householdSize,
        shower_minutes_per_day: '15.00', // Postgres numeric returns as string
        shower_heater: baseline.showerHeater,
        ac_hours_per_day: '5.00',
        fan_hours_per_day: '8.00',
        laptop_hours_per_day: '7.00',
        laundry_loads_per_week: '4.00',
        laundry_machine: baseline.laundryMachine,
        factors_version: baseline.factorsVersion,
        created_at: '2026-09-20T10:00:00Z',
      };

      const mapped = mapDbBaselineToBaseline(dbRow);
      expect(mapped.householdSize).toBe(baseline.householdSize);
      expect(mapped.showerMinutesPerDay).toBe(baseline.showerMinutesPerDay);
      expect(mapped.showerHeater).toBe(baseline.showerHeater);
      expect(mapped.acHoursPerDay).toBe(baseline.acHoursPerDay);
      expect(mapped.fanHoursPerDay).toBe(baseline.fanHoursPerDay);
      expect(mapped.laptopHoursPerDay).toBe(baseline.laptopHoursPerDay);
      expect(mapped.laundryLoadsPerWeek).toBe(baseline.laundryLoadsPerWeek);
      expect(mapped.laundryMachine).toBe(baseline.laundryMachine);
      expect(mapped.factorsVersion).toBe(baseline.factorsVersion);
    });
  });

  describe('Deviation Mappers', () => {
    const deviation: Omit<Deviation, 'id' | 'createdAt'> = {
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      field: 'acHoursPerDay',
      mode: 'delta',
      value: 3,
      note: 'Summer heatwave',
      groupId: 'group-1',
    };

    it('maps Deviation to DbDeviationInsert', () => {
      const insert = mapDeviationToDbInsert(deviation, 'user-xyz');
      expect(insert).toEqual({
        user_id: 'user-xyz',
        start_date: '2026-07-01',
        end_date: '2026-07-05',
        field: 'ac_hours_per_day',
        mode: 'delta',
        value: 3,
        note: 'Summer heatwave',
        group_id: 'group-1',
      });
    });

    it('maps DbDeviationRow to Deviation', () => {
      const row: DbDeviationRow = {
        id: 'dev-1',
        user_id: 'user-xyz',
        start_date: '2026-07-01',
        end_date: '2026-07-05',
        field: 'ac_hours_per_day',
        mode: 'delta',
        value: '3.00',
        note: 'Summer heatwave',
        group_id: 'group-1',
        created_at: '2026-09-20T10:00:00Z',
        updated_at: '2026-09-20T10:00:00Z',
      };

      const mapped = mapDbDeviationToDeviation(row);
      expect(mapped).toEqual({
        id: 'dev-1',
        startDate: '2026-07-01',
        endDate: '2026-07-05',
        field: 'acHoursPerDay',
        mode: 'delta',
        value: 3,
        note: 'Summer heatwave',
        groupId: 'group-1',
        createdAt: '2026-09-20T10:00:00Z',
      });
    });

    it('maps all engine deviation fields to db fields correctly', () => {
      const fields: Array<Deviation['field']> = [
        'showerMinutesPerDay',
        'acHoursPerDay',
        'fanHoursPerDay',
        'laptopHoursPerDay',
        'laundryLoadsPerWeek',
      ];
      for (const field of fields) {
        const insert = mapDeviationToDbInsert(
          { startDate: '2026-01-01', endDate: '2026-01-02', field, mode: 'override', value: 0 },
          'u1'
        );
        expect(insert.field).toBeTruthy();
      }
    });
  });

  describe('FactorSet Mapper', () => {
    it('maps DbFactorSetRow to FactorSetPayload', () => {
      const row: DbFactorSetRow = {
        version: '1.0.0',
        region: 'global',
        effective_from: '2026-01-01',
        payload: {
          version: '1.0.0',
          region: 'global',
          effectiveFrom: '2026-01-01',
          factors: [
            {
              id: 'shower.flow',
              label: 'Shower Flow',
              unit: 'L/min',
              low: 6,
              typical: 9,
              high: 12,
              source: 'EPA',
              version: '1.0.0',
              region: 'global',
            },
          ],
        },
        created_at: '2026-09-20T00:00:00Z',
      };

      const mapped = mapDbFactorSetToFactorSet(row);
      expect(mapped.version).toBe('1.0.0');
      expect(mapped.factors.length).toBe(1);
      expect(mapped.factors[0].id).toBe('shower.flow');
    });
  });

  describe('Goal Mappers', () => {
    const baselineSnapshot: BaselineProfile = {
      id: 'snap-1',
      userId: 'user-xyz',
      effectiveFrom: '2026-09-01',
      householdSize: 2,
      showerMinutesPerDay: 10,
      showerHeater: 'electric',
      acHoursPerDay: 4,
      fanHoursPerDay: 6,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
      laundryMachine: 'topLoad',
      factorsVersion: '1.0.0',
    };

    it('maps GoalInput to DbGoalInsert', () => {
      const insert = mapGoalToDbInsert(
        { resource: 'water', period: 'week', targetAmount: 150 },
        baselineSnapshot,
        '2026-09-01',
        'user-xyz'
      );

      expect(insert).toEqual({
        user_id: 'user-xyz',
        resource: 'water',
        period: 'week',
        target_amount: 150,
        start_date: '2026-09-01',
        reference_profile: baselineSnapshot,
        status: 'active',
      });
    });

    it('maps DbGoalRow to Goal with intact jsonb reference snapshot', () => {
      const dbRow: DbGoalRow = {
        id: 'goal-uuid-1',
        user_id: 'user-xyz',
        resource: 'water',
        period: 'week',
        target_amount: '150.00',
        start_date: '2026-09-01',
        reference_profile: baselineSnapshot as any,
        status: 'active',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      };

      const goal = mapDbGoalToGoal(dbRow);
      expect(goal.id).toBe('goal-uuid-1');
      expect(goal.targetAmount).toBe(150);
      expect(goal.resource).toBe('water');
      expect(goal.period).toBe('week');
      expect(goal.referenceProfile.householdSize).toBe(2);
      expect(goal.status).toBe('active');
    });
  });

  describe('Team RPC Mappers', () => {
    it('maps RPC my_teams row to MyTeam', () => {
      const raw = {
        id: 't-1',
        name: 'Eco Team',
        role: 'owner',
        alias: 'AliceEco',
        sharing: true,
        member_count: 5,
        target_resource: 'water',
        target_amount: '500.00',
        show_leaderboard: true,
        created_at: '2026-09-20T00:00:00Z',
        join_code: '23456789AB',
      };

      const team = mapRpcMyTeamToMyTeam(raw);
      expect(team).toEqual({
        id: 't-1',
        name: 'Eco Team',
        role: 'owner',
        alias: 'AliceEco',
        sharing: true,
        memberCount: 5,
        targetResource: 'water',
        targetAmount: 500,
        showLeaderboard: true,
        createdAt: '2026-09-20T00:00:00Z',
        joinCode: '23456789AB',
      });
    });

    it('maps RPC team_members row to TeamMember', () => {
      const raw = {
        member_id: 'm-1',
        alias: 'BobEco',
        role: 'member',
        sharing: false,
        joined_at: '2026-09-20T01:00:00Z',
      };

      const member = mapRpcTeamMemberToTeamMember(raw);
      expect(member).toEqual({
        memberId: 'm-1',
        alias: 'BobEco',
        role: 'member',
        sharing: false,
        joinedAt: '2026-09-20T01:00:00Z',
      });
    });

    it('maps RPC team_summary row to TeamSummary', () => {
      const raw = {
        member_count: 4,
        sharing_count: 3,
        visible: true,
        days_window: 30,
        total_water_saved_l: '162.00',
        total_energy_saved_kwh: '4.698',
        target_resource: 'water',
        target_amount: '500.00',
        target_progress: '0.324',
      };

      const summary = mapRpcTeamSummaryToTeamSummary(raw);
      expect(summary.visible).toBe(true);
      expect(summary.totalWaterSavedL).toBe(162);
      expect(summary.totalEnergySavedKwh).toBe(4.698);
      expect(summary.targetProgress).toBe(0.324);
    });

    it('maps RPC leaderboard row to LeaderboardEntry', () => {
      const raw = {
        rank: 1,
        alias: 'AliceEco',
        pct_water: 16,
        pct_energy: 9,
        pct_overall: 13,
        days_counted: 3,
        is_me: true,
      };

      const entry = mapRpcLeaderboardEntryToLeaderboardEntry(raw);
      expect(entry).toEqual({
        rank: 1,
        alias: 'AliceEco',
        pctWater: 16,
        pctEnergy: 9,
        pctOverall: 13,
        daysCounted: 3,
        isMe: true,
      });
    });
  });
});
