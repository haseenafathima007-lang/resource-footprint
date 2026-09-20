import "@testing-library/jest-dom";
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TeamsPage from './TeamsPage';
import { ConsentDialog } from '@/components/teams/ConsentDialog.tsx';

vi.mock('@/hooks/useTeams.ts', () => ({
  useTeams: vi.fn(() => ({
    teams: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    createTeam: vi.fn(),
    joinTeam: vi.fn(),
  })),
}));

describe('Phase 7 Accessibility Audits', () => {
  it('TeamsPage has no aria structural violations', () => {
    const { container } = render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    const headings = container.querySelectorAll('h1, h2, h3');
    expect(headings.length).toBeGreaterThan(0);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('type');
    });
  });

  it('ConsentDialog has appropriate aria attributes and dialog roles', () => {
    const { container } = render(
      <ConsentDialog
        isOpen={true}
        teamName="Test Squad"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'consent-dialog-title');
  });
});
