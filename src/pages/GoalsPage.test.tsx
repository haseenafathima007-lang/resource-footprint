// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GoalsPage } from './GoalsPage';
import { baselineRepository } from '@/services/supabase/baselineRepository';
import { deviationRepository } from '@/services/supabase/deviationRepository';
import { goalRepository } from '@/services/supabase/goalRepository';
import { factorRepository } from '@/services/supabase/factorRepository';
import factorsData from '@/data/factors.v1.json';
import type { BaselineProfile } from '@/engine';

vi.mock('@/services/supabase/baselineRepository.ts', () => ({
  baselineRepository: {
    getCurrentBaseline: vi.fn(),
    getBaselineHistory: vi.fn(),
  },
}));

vi.mock('@/services/supabase/deviationRepository.ts', () => ({
  deviationRepository: {
    list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  },
}));

vi.mock('@/services/supabase/goalRepository.ts', () => ({
  goalRepository: {
    list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    create: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services/supabase/factorRepository.ts', () => ({
  factorRepository: {
    getFactorSet: vi.fn().mockImplementation(async () => {
      const data = await import('@/data/factors.v1.json');
      return { ok: true, data: data.default };
    }),
  },
}));

const mockProfile: BaselineProfile = {
  id: 'b-1',
  userId: 'user-1',
  effectiveFrom: '2026-01-01',
  factorsVersion: factorsData.version,
  householdSize: 2,
  showerMinutesPerDay: 10,
  showerHeater: 'electric',
  acHoursPerDay: 4,
  fanHoursPerDay: 8,
  laptopHoursPerDay: 8,
  laundryLoadsPerWeek: 3,
  laundryMachine: 'topLoad',
};

const fixedClock = () => new Date('2026-09-20T00:00:00.000Z');

describe('GoalsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({ ok: true, data: mockProfile });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({ ok: true, data: [mockProfile] });
    vi.mocked(deviationRepository.list).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(goalRepository.list).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(factorRepository.getFactorSet).mockResolvedValue({ ok: true, data: factorsData as any });
  });

  it('renders title and goal creation form when loaded', async () => {
    render(
      <MemoryRouter>
        <GoalsPage clock={fixedClock} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Resource Reduction Goals')).toBeInTheDocument();
    });

    expect(screen.getByText('Set a Resource Reduction Goal')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Water \(Litres\)/i })).toBeInTheDocument();
  });

  it('displays empty state when no active goals exist', async () => {
    render(
      <MemoryRouter>
        <GoalsPage clock={fixedClock} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No active reduction goals')).toBeInTheDocument();
    });
  });
});
