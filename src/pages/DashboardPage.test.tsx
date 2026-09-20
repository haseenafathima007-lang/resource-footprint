// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage.tsx';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import { factorRepository } from '@/services/supabase/factorRepository.ts';
import factorsData from '@/data/factors.v1.json';
import type { BaselineProfile, FactorSetPayload } from '@/engine';

vi.mock('@/services/supabase/baselineRepository.ts', () => ({
  baselineRepository: {
    getCurrentBaseline: vi.fn(),
    getBaselineHistory: vi.fn(),
  },
}));

vi.mock('@/services/supabase/factorRepository.ts', () => ({
  factorRepository: {
    getFactorSet: vi.fn(),
  },
}));

// Mock Recharts ResponsiveContainer to render children in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

const defaultProfile: BaselineProfile = {
  id: 'b-1',
  userId: 'user-1',
  effectiveFrom: '2026-01-01',
  factorsVersion: factorsData.version,
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: 'electric',
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: 'topLoad',
};

describe('DashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton while fetching baseline data', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockReturnValue(new Promise(() => {}));
    vi.mocked(baselineRepository.getBaselineHistory).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status', { name: /loading dashboard data/i })).toBeDefined();
  });

  it('renders error state and retries fetch when retry button is clicked', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValueOnce({
      ok: false,
      error: { code: 'NETWORK', message: 'Failed to connect to database' },
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValueOnce({
      ok: true,
      data: [],
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Failed to connect to database')).toBeDefined();
    });

    // Mock success on retry
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValueOnce({
      ok: true,
      data: defaultProfile,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValueOnce({
      ok: true,
      data: [defaultProfile],
    });

    const user = userEvent.setup();
    const retryBtn = screen.getByRole('button', { name: /retry loading/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /resource dashboard/i })).toBeDefined();
    });
  });

  it('renders empty state when user has no baseline profile', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: null,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [],
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Your Dashboard')).toBeDefined();
      expect(screen.getByRole('link', { name: /start onboarding wizard/i })).toBeDefined();
    });
  });

  it('renders populated dashboard with hand-computed typical totals (default month)', async () => {
    /**
     * Hand arithmetic for Monthly Totals:
     * - Daily water typical = 164.29 L. Monthly (x30) = 4,928.7 L.
     *   formatTypicalValue rounds to 2 sig figs: roundToSigFigs(4928.7, 2) = 4,900.
     * - Daily energy typical = 8.699 kWh. Monthly (x30) = 260.97 kWh.
     *   formatTypicalValue rounds to 2 sig figs: roundToSigFigs(260.97, 2) = 260.
     * - Sustainability score: water score 84.3, energy score 5.0 -> overall 44.6 -> Math.round is 45.
     */
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: defaultProfile,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [defaultProfile],
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /resource dashboard/i })).toBeDefined();
    });

    // Monthly Water footprint (~4,900 L / month)
    expect(screen.getByText(/~4,900/i)).toBeDefined();

    // Monthly Energy footprint (~260 kWh / month)
    expect(screen.getByText(/~260/i)).toBeDefined();

    // Sustainability score 45, band "Room to improve"
    expect(screen.getByText('45')).toBeDefined();
    expect(screen.getByText('Room to improve')).toBeDefined();
  });

  it('period toggle changes totals between Month and Day', async () => {
    /**
     * Hand arithmetic:
     * - Monthly: Water ~4,900 L, Energy ~260 kWh
     * - Daily: Water 164.29 L -> 2 sig figs = ~160 L. Energy 8.699 kWh -> 2 sig figs = ~8.7 kWh.
     */
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: defaultProfile,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [defaultProfile],
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/~4,900/i)).toBeDefined();
    });

    const user = userEvent.setup();

    // Switch to Day
    const dayBtn = screen.getByRole('button', { name: 'Day' });
    await user.click(dayBtn);

    // Daily Water: ~160 L / day; Daily Energy: ~8.7 kWh / day
    await waitFor(() => {
      expect(screen.getByText(/~160/i)).toBeDefined();
      expect(screen.getByText(/~8.7/i)).toBeDefined();
    });

    // Switch back to Month
    const monthBtn = screen.getByRole('button', { name: 'Month' });
    await user.click(monthBtn);

    await waitFor(() => {
      expect(screen.getByText(/~4,900/i)).toBeDefined();
    });
  });

  it('renders history empty state when only 1 baseline exists', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: defaultProfile,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [defaultProfile], // Single entry
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/your history will build up as you update your baseline/i)).toBeDefined();
    });
  });

  it('renders history chart when 2 or more baselines exist', async () => {
    const historicalProfile: BaselineProfile = {
      ...defaultProfile,
      id: 'b-0',
      effectiveFrom: '2025-06-01',
      showerMinutesPerDay: 15,
    };

    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: defaultProfile,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [defaultProfile, historicalProfile],
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/baseline history trend/i)).toBeDefined();
      expect(screen.getByText(/2 baseline updates/i)).toBeDefined();
    });
  });

  it('handles unresolvable factor version by displaying notice', async () => {
    const baselineWithUnknownFactors: BaselineProfile = {
      ...defaultProfile,
      factorsVersion: '99.0.0', // Non-existent factor version
    };

    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: baselineWithUnknownFactors,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [baselineWithUnknownFactors],
    });
    // Factor repository returns error or mismatch
    vi.mocked(factorRepository.getFactorSet).mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Version not found' },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/factor version unavailable/i)).toBeDefined();
      expect(screen.getByText(/99.0.0/)).toBeDefined();
    });
  });

  it('shows trust banner when factors are unverified, hides when verified', async () => {
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: defaultProfile,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [defaultProfile],
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    // Default factorsData has verified: false, so banner appears
    await waitFor(() => {
      expect(screen.getByText(/placeholder averages that are still being verified/i)).toBeDefined();
    });

    unmount();

    // Now test with verified factors
    const verifiedFactors: FactorSetPayload = {
      ...factorsData,
      version: '1.0.0-verified',
      factors: factorsData.factors.map((f) => ({ ...f, verified: true })),
    };

    const verifiedBaseline: BaselineProfile = {
      ...defaultProfile,
      factorsVersion: '1.0.0-verified',
    };

    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: verifiedBaseline,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [verifiedBaseline],
    });
    vi.mocked(factorRepository.getFactorSet).mockResolvedValue({
      ok: true,
      data: verifiedFactors,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /resource dashboard/i })).toBeDefined();
    });

    // Trust banner should be hidden
    expect(screen.queryByText(/placeholder averages that are still being verified/i)).toBeNull();
  });
});
