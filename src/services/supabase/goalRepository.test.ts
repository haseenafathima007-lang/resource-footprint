import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseGoalRepository } from './goalRepository.ts';
import type { BaselineProfile } from '../../types/profile.ts';
import factorsData from '../../data/factors.v1.json';

describe('SupabaseGoalRepository', () => {
  let mockClient: any;
  let repo: SupabaseGoalRepository;

  const validBaseline: BaselineProfile = {
    id: 'base-1',
    userId: 'test-user-uuid',
    effectiveFrom: '2026-09-01',
    householdSize: 1,
    showerMinutesPerDay: 10,
    showerHeater: 'electric',
    acHoursPerDay: 4,
    fanHoursPerDay: 6,
    laptopHoursPerDay: 6,
    laundryLoadsPerWeek: 4,
    laundryMachine: 'topLoad',
    factorsVersion: '1.0.0',
  };

  beforeEach(() => {
    mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: 'test-user-uuid' },
            },
          },
        }),
      },
      from: vi.fn(),
    };
    repo = new SupabaseGoalRepository(mockClient);
  });

  describe('create and validation short-circuit', () => {
    it('returns VALIDATION error without calling client when target exceeds typical use', async () => {
      const res = await repo.create(
        { resource: 'water', period: 'week', targetAmount: 5000 },
        validBaseline,
        '2026-09-01',
        factorsData.factors
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
        expect(res.error.details).toBeDefined();
      }
      expect(mockClient.from).not.toHaveBeenCalled();
    });

    it('returns VALIDATION error without calling client when target <= 0', async () => {
      const res = await repo.create(
        { resource: 'water', period: 'week', targetAmount: -10 },
        validBaseline,
        '2026-09-01',
        factorsData.factors
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
      }
      expect(mockClient.from).not.toHaveBeenCalled();
    });

    it('creates a goal and returns mapped Goal object on success', async () => {
      const mockDbRow = {
        id: 'goal-uuid-1',
        user_id: 'test-user-uuid',
        resource: 'water',
        period: 'week',
        target_amount: 150,
        start_date: '2026-09-01',
        reference_profile: validBaseline,
        status: 'active',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      };

      const selectSingleMock = vi.fn().mockResolvedValue({ data: mockDbRow, error: null });
      const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: selectSingleMock }) });
      mockClient.from.mockReturnValue({ insert: insertMock });

      const res = await repo.create(
        { resource: 'water', period: 'week', targetAmount: 150 },
        validBaseline,
        '2026-09-01',
        factorsData.factors
      );

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.id).toBe('goal-uuid-1');
        expect(res.data.targetAmount).toBe(150);
        expect(res.data.status).toBe('active');
        expect(res.data.referenceProfile.showerMinutesPerDay).toBe(10);
      }
      expect(mockClient.from).toHaveBeenCalledWith('goals');
    });

    it('maps 23505 unique violation error to CONFLICT with a friendly message', async () => {
      const selectSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "idx_goals_user_resource_period_active"',
        },
      });
      const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: selectSingleMock }) });
      mockClient.from.mockReturnValue({ insert: insertMock });

      const res = await repo.create(
        { resource: 'water', period: 'week', targetAmount: 150 },
        validBaseline,
        '2026-09-01',
        factorsData.factors
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('CONFLICT');
        expect(res.error.message).toMatch(/already have an active week water goal/i);
      }
    });
  });

  describe('list and snapshot validation', () => {
    it('returns UNAUTHENTICATED when session is null', async () => {
      mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

      const res = await repo.list();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('UNAUTHENTICATED');
      }
    });

    it('marks goal status as unavailable when snapshot is invalid', async () => {
      const corruptedDbRow = {
        id: 'goal-uuid-bad',
        user_id: 'test-user-uuid',
        resource: 'water',
        period: 'week',
        target_amount: 150,
        start_date: '2026-09-01',
        reference_profile: { householdSize: -5 }, // invalid snapshot
        status: 'active',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      };

      const orderMock = vi.fn().mockResolvedValue({ data: [corruptedDbRow], error: null });
      const eqUserMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqUserMock });
      mockClient.from.mockReturnValue({ select: selectMock });

      const res = await repo.list();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBe(1);
        expect(res.data[0].status).toBe('unavailable');
      }
    });
  });

  describe('archive and remove', () => {
    it('archives a goal successfully', async () => {
      const archivedDbRow = {
        id: 'goal-1',
        user_id: 'test-user-uuid',
        resource: 'water',
        period: 'week',
        target_amount: 150,
        start_date: '2026-09-01',
        reference_profile: validBaseline,
        status: 'archived',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-05T10:00:00Z',
      };

      const selectSingleMock = vi.fn().mockResolvedValue({ data: archivedDbRow, error: null });
      const eqUserMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: selectSingleMock }) });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      mockClient.from.mockReturnValue({ update: updateMock });

      const res = await repo.archive('goal-1');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('archived');
      }
    });

    it('removes a goal successfully', async () => {
      const eqUserMock = vi.fn().mockResolvedValue({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      mockClient.from.mockReturnValue({ delete: deleteMock });

      const res = await repo.remove('goal-1');
      expect(res.ok).toBe(true);
    });
  });
});
