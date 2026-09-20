import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseBaselineRepository } from './baselineRepository.ts';
import type { BaselineProfile } from '../../types/profile.ts';

describe('SupabaseBaselineRepository', () => {
  let mockSupabase: any;
  let repo: SupabaseBaselineRepository;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'test-user-id' } } },
        }),
      },
      from: vi.fn(),
    };
    repo = new SupabaseBaselineRepository(mockSupabase as any);
  });

  it('returns VALIDATION error for out-of-range inputs WITHOUT calling the database', async () => {
    const invalidProfile: BaselineProfile = {
      effectiveFrom: '2026-01-01',
      householdSize: 0, // invalid (min 1)
      showerMinutesPerDay: 200, // invalid (max 120)
      showerHeater: 'electric',
      acHoursPerDay: 26, // invalid (max 24)
      fanHoursPerDay: 8,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 4,
      laundryMachine: 'frontLoad',
      factorsVersion: '1.0.0',
    };

    const result = await repo.saveBaseline(invalidProfile);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toContain('out of valid bounds');
      expect(result.error.details).toBeDefined();
    }

    // CRITICAL ASSERTION: The database was never called
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
  });

  it('calls upsert when input is valid and user is authenticated', async () => {
    const validProfile: BaselineProfile = {
      effectiveFrom: '2026-01-01',
      householdSize: 2,
      showerMinutesPerDay: 10,
      showerHeater: 'electric',
      acHoursPerDay: 4,
      fanHoursPerDay: 8,
      laptopHoursPerDay: 6,
      laundryLoadsPerWeek: 3,
      laundryMachine: 'frontLoad',
      factorsVersion: '1.0.0',
    };

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'baseline-123',
        user_id: 'test-user-id',
        effective_from: '2026-01-01',
        household_size: 2,
        shower_minutes_per_day: '10.00',
        shower_heater: 'electric',
        ac_hours_per_day: '4.00',
        fan_hours_per_day: '8.00',
        laptop_hours_per_day: '6.00',
        laundry_loads_per_week: '3.00',
        laundry_machine: 'frontLoad',
        factors_version: '1.0.0',
        created_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

    const result = await repo.saveBaseline(validProfile);

    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('baseline_profiles');
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('returns UNAUTHENTICATED when user has no session', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    const validProfile: BaselineProfile = {
      effectiveFrom: '2026-01-01',
      householdSize: 2,
      showerMinutesPerDay: 10,
      showerHeater: 'none',
      acHoursPerDay: 2,
      fanHoursPerDay: 4,
      laptopHoursPerDay: 4,
      laundryLoadsPerWeek: 2,
      laundryMachine: 'topLoad',
      factorsVersion: '1.0.0',
    };

    const result = await repo.saveBaseline(validProfile);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHENTICATED');
    }
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
