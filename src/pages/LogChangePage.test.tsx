// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LogChangePage } from './LogChangePage.tsx';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import { deviationRepository } from '@/services/supabase/deviationRepository.ts';
import factorsData from '@/data/factors.v1.json';
import type { BaselineProfile, Deviation } from '@/engine';

vi.mock('@/services/supabase/baselineRepository.ts', () => ({
  baselineRepository: {
    getCurrentBaseline: vi.fn(),
    getBaselineHistory: vi.fn(),
  },
}));

vi.mock('@/services/supabase/deviationRepository.ts', () => ({
  deviationRepository: {
    list: vi.fn(),
    addMany: vi.fn(),
    delete: vi.fn(),
    removeGroup: vi.fn(),
  },
}));

const mockBaseline: BaselineProfile = {
  id: 'base-1',
  userId: 'user-1',
  effectiveFrom: '2026-01-01',
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: 'electric',
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: 'topLoad',
  factorsVersion: factorsData.version,
};

const mockDeviation: Deviation = {
  id: 'dev-1',
  startDate: '2026-07-01',
  endDate: '2026-07-05',
  field: 'acHoursPerDay',
  mode: 'delta',
  value: 3,
  note: 'Summer heatwave',
  groupId: 'group-100',
  createdAt: '2026-07-01T00:00:00Z',
};

describe('LogChangePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading indicator while fetching data', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockReturnValue(new Promise(() => {}));
    vi.mocked(baselineRepository.getBaselineHistory).mockReturnValue(new Promise(() => {}));
    vi.mocked(deviationRepository.list).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <LogChangePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading change logger/i)).toBeDefined();
  });

  it('renders notice to onboard if baseline is missing', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: null,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [],
    });
    vi.mocked(deviationRepository.list).mockResolvedValue({
      ok: true,
      data: [],
    });

    render(
      <MemoryRouter>
        <LogChangePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Baseline Required')).toBeDefined();
      expect(screen.getByRole('link', { name: /complete onboarding/i })).toBeDefined();
    });
  });

  it('renders presets and logged history when baseline exists', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: mockBaseline,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [mockBaseline],
    });
    vi.mocked(deviationRepository.list).mockResolvedValue({
      ok: true,
      data: [mockDeviation],
    });

    render(
      <MemoryRouter>
        <LogChangePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /log a temporary change/i })).toBeDefined();
      expect(screen.getAllByText('Summer heatwave').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('House guests')).toBeDefined();
      expect(screen.getByText('Away / Vacation')).toBeDefined();
      expect(screen.getByText('Logged Changes History')).toBeDefined();
      expect(screen.getByText(/2026-07-01 to 2026-07-05/)).toBeDefined();
    });
  });

  it('flows through selecting a preset, previewing impact, logging change, and undoing', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: mockBaseline,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [mockBaseline],
    });
    vi.mocked(deviationRepository.list).mockResolvedValue({
      ok: true,
      data: [],
    });
    vi.mocked(deviationRepository.addMany).mockResolvedValue({
      ok: true,
      data: [
        {
          ...mockDeviation,
          id: 'dev-new',
          groupId: 'grp-test-1',
        },
      ],
    });
    vi.mocked(deviationRepository.removeGroup).mockResolvedValue({
      ok: true,
      data: undefined,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LogChangePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Summer heatwave')).toBeDefined();
    });

    // 1. Select "Summer heatwave" preset
    const heatwaveBtn = screen.getByRole('radio', { name: /summer heatwave/i });
    await user.click(heatwaveBtn);

    // 2. We should be on step 2
    expect(screen.getByText(/step 2 of 2/i)).toBeDefined();
    expect(screen.getByRole('heading', { name: /estimated impact/i })).toBeDefined();

    // 3. Submit the form
    const logBtn = screen.getByRole('button', { name: /log change/i });
    await user.click(logBtn);

    // 4. Verify addMany was called
    await waitFor(() => {
      expect(deviationRepository.addMany).toHaveBeenCalledTimes(1);
    });

    // 5. Verify Undo toast appears
    expect(screen.getByText('Change logged successfully.')).toBeDefined();
    const undoBtn = screen.getByRole('button', { name: /undo/i });
    await user.click(undoBtn);

    // 6. Verify removeGroup was called
    await waitFor(() => {
      expect(deviationRepository.removeGroup).toHaveBeenCalled();
    });
  });

  it('allows deleting an existing deviation group with modal confirmation', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: mockBaseline,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [mockBaseline],
    });
    vi.mocked(deviationRepository.list).mockResolvedValue({
      ok: true,
      data: [mockDeviation],
    });
    vi.mocked(deviationRepository.removeGroup).mockResolvedValue({
      ok: true,
      data: undefined,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LogChangePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/2026-07-01 to 2026-07-05/)).toBeDefined();
    });

    // Click trash button
    const deleteBtn = screen.getByRole('button', { name: /delete change for 2026-07-01/i });
    await user.click(deleteBtn);

    // Dialog opens
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { name: /delete logged change/i })).toBeDefined();

    // Confirm delete
    const confirmBtn = screen.getByRole('button', { name: /^delete change$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deviationRepository.removeGroup).toHaveBeenCalledWith('group-100');
    });
  });
});
