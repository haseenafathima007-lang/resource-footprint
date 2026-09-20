// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { SaveBaselineButton } from './ResultsPanel.tsx';
import * as useAuthModule from '@/hooks/useAuth.tsx';
import { loadPendingBaseline } from '@/lib/pendingBaseline.ts';
import type { BaselineProfile } from '@/engine';

vi.mock('@/hooks/useAuth.tsx', () => ({
  useAuth: vi.fn(),
}));

const mockBaseline: BaselineProfile = {
  effectiveFrom: '2026-01-01',
  factorsVersion: '1.0.0',
  householdSize: 2,
  showerMinutesPerDay: 15,
  showerHeater: 'electric',
  acHoursPerDay: 5,
  fanHoursPerDay: 7,
  laptopHoursPerDay: 8,
  laundryLoadsPerWeek: 3,
  laundryMachine: 'topLoad',
};

// Storage mock for jsdom / Node 22+
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

function LocationDisplay() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
      <div data-testid="state">{JSON.stringify(location.state)}</div>
    </div>
  );
}

describe('Simulator SaveBaselineButton Handoff', () => {
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

  it('signed-out user: saves pending baseline to localStorage and routes to /auth', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={<SaveBaselineButton currentBaseline={mockBaseline} />}
          />
          <Route path="/auth" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /save this as my baseline/i });
    await user.click(btn);

    // Target route should be /auth
    expect(screen.getByTestId('pathname').textContent).toBe('/auth');

    // Location state preserves intended destination to onboarding
    expect(screen.getByTestId('state').textContent).toContain('/onboarding');
    expect(screen.getByTestId('state').textContent).toContain('?from=simulator');

    // Storage holds the pending baseline profile
    const pending = loadPendingBaseline();
    expect(pending).toEqual(mockBaseline);
  });

  it('signed-in user: navigates to /onboarding?from=simulator directly with baseline in state', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 'test-user-1', email: 'test@example.com' } as any,
      session: { access_token: 'xyz' } as any,
      profile: { id: 'test-user-1', displayName: 'Tester', createdAt: '', updatedAt: '' },
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={<SaveBaselineButton currentBaseline={mockBaseline} />}
          />
          <Route path="/onboarding" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /save this as my baseline/i });
    await user.click(btn);

    expect(screen.getByTestId('pathname').textContent).toBe('/onboarding');
    expect(screen.getByTestId('search').textContent).toBe('?from=simulator');
    expect(screen.getByTestId('state').textContent).toContain('"showerMinutesPerDay":15');

    // No pending baseline needed in localStorage for already signed-in user
    expect(loadPendingBaseline()).toBeNull();
  });
});
