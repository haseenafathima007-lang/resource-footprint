import { describe, it, expect } from 'vitest';
import {
  mapDbProfileToProfile,
  mapDbBaselineToBaseline,
  mapBaselineToDbInsert,
  mapDbDeviationToDeviation,
  mapDeviationToDbInsert,
  mapDbFactorSetToFactorSet,
  type DbProfileRow,
  type DbBaselineProfileRow,
  type DbDeviationRow,
  type DbFactorSetRow,
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
      field: 'ac_hours_per_day',
      mode: 'delta',
      value: 3,
      note: 'Summer heatwave',
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
        created_at: '2026-09-20T10:00:00Z',
      };

      const mapped = mapDbDeviationToDeviation(row);
      expect(mapped).toEqual({
        id: 'dev-1',
        userId: 'user-xyz',
        startDate: '2026-07-01',
        endDate: '2026-07-05',
        field: 'ac_hours_per_day',
        mode: 'delta',
        value: 3,
        note: 'Summer heatwave',
        createdAt: '2026-09-20T10:00:00Z',
      });
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
});
