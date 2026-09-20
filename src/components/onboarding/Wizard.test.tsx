// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Wizard } from './Wizard.tsx';
import { baselineRepository } from '@/services/supabase/baselineRepository.ts';
import { savePendingBaseline, loadPendingBaseline } from '@/lib/pendingBaseline.ts';
import type { BaselineProfile } from '@/engine';

vi.mock('@/services/supabase/baselineRepository.ts', () => ({
  baselineRepository: {
    saveBaseline: vi.fn(),
    getCurrentBaseline: vi.fn(),
    getBaselineHistory: vi.fn(),
  },
}));

// Mock localStorage for Node 22+
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  },
};

function DashboardMock() {
  const location = useLocation();
  return (
    <div>
      <h1>Dashboard Target</h1>
      <span data-testid="dash-state">{JSON.stringify(location.state)}</span>
    </div>
  );
}

function AuthMock() {
  return <h1>Auth Target</h1>;
}

describe('Onboarding Wizard Component', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders step 1 with default habits and advances when valid', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Verify Step 1 heading and controls
    expect(screen.getByRole('heading', { level: 2, name: /set up your baseline/i })).toBeDefined();
    expect(screen.getByLabelText(/daily shower duration/i)).toBeDefined();

    // Advance to Step 2
    const nextBtn = screen.getByRole('button', { name: /next/i });
    await user.click(nextBtn);

    // Step 2 is now active
    expect(screen.getByLabelText(/air conditioner usage/i)).toBeDefined();
  });

  it('step validation blocks Next on invalid input', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const showerInput = screen.getByLabelText(/daily shower duration/i);

    // Enter out-of-bounds shower duration (150 > max 120)
    await user.clear(showerInput);
    await user.type(showerInput, '150');

    const nextBtn = screen.getByRole('button', { name: /next/i });
    await user.click(nextBtn);

    // Should remain on Step 1 with error message
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/shower minutes per day must be between 0 and 120/i)).toBeDefined();
    expect(screen.queryByLabelText(/air conditioner usage/i)).toBeNull();
  });

  it('allows typing decimal numbers like "2.5" into numeric fields', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Advance to Step 2
    await user.click(screen.getByRole('button', { name: /next/i }));

    const acInput = screen.getByLabelText(/air conditioner usage/i);
    await user.clear(acInput);
    await user.type(acInput, '2.5');

    expect((acInput as HTMLInputElement).value).toBe('2.5');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('values persist across Back and Next steps', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const showerInput = screen.getByLabelText(/daily shower duration/i);

    await user.clear(showerInput);
    await user.type(showerInput, '25');

    // Go to Step 2
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText(/air conditioner usage/i)).toBeDefined();

    // Go Back to Step 1
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect((screen.getByLabelText(/daily shower duration/i) as HTMLInputElement).value).toBe('25');
  });

  it('Edit links on review step navigate back to the corresponding step', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Walk through Steps 1 -> 2 -> 3 -> 4
    await user.click(screen.getByRole('button', { name: /next/i })); // to 2
    await user.click(screen.getByRole('button', { name: /next/i })); // to 3
    await user.click(screen.getByRole('button', { name: /next/i })); // to 4 (Review)

    expect(screen.getByText(/review your baseline/i)).toBeDefined();

    // Click Edit Showers
    const editShowerBtn = screen.getByRole('button', { name: /edit showers step/i });
    await user.click(editShowerBtn);

    // Should return to Step 1
    expect(screen.getByLabelText(/daily shower duration/i)).toBeDefined();
  });

  it('save success clears pending baseline and navigates to /dashboard with confirmation', async () => {
    // Pre-populate a pending baseline in localStorage
    const samplePending: BaselineProfile = {
      effectiveFrom: '2026-01-01',
      factorsVersion: '1.0.0',
      householdSize: 1,
      showerMinutesPerDay: 12,
      showerHeater: 'electric',
      acHoursPerDay: 3,
      fanHoursPerDay: 5,
      laptopHoursPerDay: 4,
      laundryLoadsPerWeek: 2,
      laundryMachine: 'frontLoad',
    };
    savePendingBaseline(samplePending);

    vi.mocked(baselineRepository.saveBaseline).mockResolvedValue({
      ok: true,
      data: samplePending,
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<Wizard />} />
          <Route path="/dashboard" element={<DashboardMock />} />
        </Routes>
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Notice banner for guest simulator habits
    expect(screen.getByText(/simulator habits loaded/i)).toBeDefined();

    // Go to review step
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Click Save Baseline
    const saveBtn = screen.getByRole('button', { name: /save baseline/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Target')).toBeDefined();
    });

    // Confirmation state is delivered
    expect(screen.getByTestId('dash-state').textContent).toContain('Baseline saved successfully.');

    // Pending baseline was cleared
    expect(loadPendingBaseline()).toBeNull();
  });

  it('re-directs to /auth if save returns UNAUTHENTICATED error', async () => {
    vi.mocked(baselineRepository.saveBaseline).mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: 'Session expired' },
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<Wizard />} />
          <Route path="/auth" element={<AuthMock />} />
        </Routes>
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Go to step 4
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.click(screen.getByRole('button', { name: /save baseline/i }));

    await waitFor(() => {
      expect(screen.getByText('Auth Target')).toBeDefined();
    });
  });

  it('NETWORK error keeps entered values and displays retry button', async () => {
    vi.mocked(baselineRepository.saveBaseline).mockResolvedValueOnce({
      ok: false,
      error: { code: 'NETWORK', message: 'Network connection failed' },
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Step 1: edit shower to 18
    const showerInput = screen.getByLabelText(/daily shower duration/i);
    await user.clear(showerInput);
    await user.type(showerInput, '18');

    // Go to Step 4
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.click(screen.getByRole('button', { name: /save baseline/i }));

    // Network error banner and retry button appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/network connection failed/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /retry save/i })).toBeDefined();
    });

    // Values were preserved
    expect(screen.getByText(/18 minutes \/ day/i)).toBeDefined();
  });

  it('VALIDATION error from server routes user to the step with the invalid field', async () => {
    vi.mocked(baselineRepository.saveBaseline).mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Invalid profile',
        details: { acHoursPerDay: 'AC hours per day must be between 0 and 24' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard />
      </MemoryRouter>
    );

    const user = userEvent.setup();

    // Go to step 4
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.click(screen.getByRole('button', { name: /save baseline/i }));

    // Lands on Step 2 where AC field lives
    await waitFor(() => {
      expect(screen.getByLabelText(/air conditioner usage/i)).toBeDefined();
      expect(screen.getByText(/ac hours per day must be between 0 and 24/i)).toBeDefined();
    });
  });

  it('renders edit mode with "Update your baseline" when existing baseline provided', () => {
    const existing: BaselineProfile = {
      effectiveFrom: '2025-06-01',
      factorsVersion: '1.0.0',
      householdSize: 3,
      showerMinutesPerDay: 14,
      showerHeater: 'none',
      acHoursPerDay: 6,
      fanHoursPerDay: 10,
      laptopHoursPerDay: 8,
      laundryLoadsPerWeek: 5,
      laundryMachine: 'topLoad',
    };

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Wizard existingBaseline={existing} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: /update your baseline/i })).toBeDefined();
    expect((screen.getByLabelText(/daily shower duration/i) as HTMLInputElement).value).toBe('14');
  });
});
