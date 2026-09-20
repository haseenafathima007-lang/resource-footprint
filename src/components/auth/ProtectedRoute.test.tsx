import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.tsx';
import * as useAuthModule from '../../hooks/useAuth.tsx';

vi.mock('../../hooks/useAuth.tsx', () => ({
  useAuth: vi.fn(),
}));

function MockAuthTarget() {
  const location = useLocation();
  return (
    <div>
      <span>Auth Page Target</span>
      <span data-testid="from-path">{JSON.stringify(location.state)}</span>
    </div>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when auth is initializing', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: true,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Checking authentication.../i)).toBeDefined();
    expect(screen.queryByText(/Secret Content/i)).toBeNull();
  });

  it('redirects to /auth and preserves destination when unauthenticated', () => {
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
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/auth" element={<MockAuthTarget />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <div>Account Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Auth Page Target')).toBeDefined();
    expect(screen.queryByText(/Account Dashboard/i)).toBeNull();
    const stateEl = screen.getByTestId('from-path');
    expect(stateEl.textContent).toContain('/account');
  });

  it('renders protected content when authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' } as any,
      session: { access_token: 'xyz' } as any,
      profile: { id: 'user-1', displayName: 'Test', createdAt: '', updatedAt: '' },
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
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <div>Protected Account View</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Account View')).toBeDefined();
  });
});
