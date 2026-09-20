import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseDeviationRepository } from './deviationRepository.ts';
import type { Deviation } from '../../types/deviation.ts';

describe('SupabaseDeviationRepository', () => {
  let mockClient: any;
  let repo: SupabaseDeviationRepository;

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
    repo = new SupabaseDeviationRepository(mockClient);
  });

  describe('validation short-circuit', () => {
    it('returns VALIDATION error without calling client when add has invalid input', async () => {
      const invalidDeviation: Omit<Deviation, 'id' | 'createdAt'> = {
        startDate: '2026-09-20',
        endDate: '2026-09-18', // end before start
        field: 'acHoursPerDay',
        mode: 'delta',
        value: 1,
      };

      const res = await repo.add(invalidDeviation);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
      }
      expect(mockClient.from).not.toHaveBeenCalled();
    });

    it('returns VALIDATION error without calling client when addMany has any invalid item', async () => {
      const devs: Omit<Deviation, 'id' | 'createdAt'>[] = [
        {
          startDate: '2026-09-20',
          endDate: '2026-09-21',
          field: 'acHoursPerDay',
          mode: 'delta',
          value: 2,
        },
        {
          startDate: '2026-09-20',
          endDate: '2026-09-21',
          field: 'acHoursPerDay',
          mode: 'delta',
          value: 0, // invalid delta 0
        },
      ];

      const res = await repo.addMany(devs);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('VALIDATION');
      }
      expect(mockClient.from).not.toHaveBeenCalled();
    });
  });

  describe('addMany atomic insert', () => {
    it('executes single insert call for array and maps returned rows', async () => {
      const mockRows = [
        {
          id: 'dev-1',
          user_id: 'test-user-uuid',
          group_id: 'grp-1',
          start_date: '2026-09-20',
          end_date: '2026-09-22',
          field: 'ac_hours_per_day',
          mode: 'delta',
          value: 3,
          note: 'Heatwave',
          created_at: '2026-09-20T10:00:00Z',
          updated_at: '2026-09-20T10:00:00Z',
        },
        {
          id: 'dev-2',
          user_id: 'test-user-uuid',
          group_id: 'grp-1',
          start_date: '2026-09-20',
          end_date: '2026-09-22',
          field: 'fan_hours_per_day',
          mode: 'delta',
          value: 2,
          note: 'Heatwave',
          created_at: '2026-09-20T10:00:00Z',
          updated_at: '2026-09-20T10:00:00Z',
        },
      ];

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockRows,
          error: null,
        }),
      });

      mockClient.from.mockReturnValue({ insert: insertMock });

      const devs: Omit<Deviation, 'id' | 'createdAt'>[] = [
        {
          groupId: 'grp-1',
          startDate: '2026-09-20',
          endDate: '2026-09-22',
          field: 'acHoursPerDay',
          mode: 'delta',
          value: 3,
          note: 'Heatwave',
        },
        {
          groupId: 'grp-1',
          startDate: '2026-09-20',
          endDate: '2026-09-22',
          field: 'fanHoursPerDay',
          mode: 'delta',
          value: 2,
          note: 'Heatwave',
        },
      ];

      const res = await repo.addMany(devs);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBe(2);
        expect(res.data[0].field).toBe('acHoursPerDay');
        expect(res.data[0].groupId).toBe('grp-1');
        expect(res.data[1].field).toBe('fanHoursPerDay');
      }

      expect(mockClient.from).toHaveBeenCalledWith('deviations');
      expect(insertMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeGroup', () => {
    it('deletes rows matching group_id and user_id', async () => {
      const deleteEqUser = vi.fn().mockResolvedValue({ error: null });
      const deleteEqGroup = vi.fn().mockReturnValue({ eq: deleteEqUser });
      mockClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: deleteEqGroup }),
      });

      const res = await repo.removeGroup('test-group-id');
      expect(res.ok).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith('deviations');
      expect(deleteEqGroup).toHaveBeenCalledWith('group_id', 'test-group-id');
      expect(deleteEqUser).toHaveBeenCalledWith('user_id', 'test-user-uuid');
    });
  });

  describe('error mapping', () => {
    it('returns UNAUTHENTICATED when session user is missing', async () => {
      mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

      const res = await repo.list();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('UNAUTHENTICATED');
      }
    });

    it('returns NETWORK error on client exception', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('Connection refused');
      });

      const res = await repo.list();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('NETWORK');
      }
    });
  });
});
