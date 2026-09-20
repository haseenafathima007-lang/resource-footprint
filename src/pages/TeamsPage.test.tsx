import "@testing-library/jest-dom";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TeamsPage from './TeamsPage';
import TeamDetailPage from './TeamDetailPage';

// Mock hooks
vi.mock('@/hooks/useTeams.ts', () => ({
  useTeams: vi.fn(),
}));

vi.mock('@/hooks/useTeam.ts', () => ({
  useTeam: vi.fn(),
}));

vi.mock('@/hooks/useTeamSync.ts', () => ({
  useTeamSync: vi.fn(),
}));

vi.mock('@/hooks/useBaseline.ts', () => ({
  useBaseline: vi.fn(() => ({ snapshot: null, history: [] })),
}));

vi.mock('@/hooks/useDeviations.ts', () => ({
  useDeviations: vi.fn(() => ({ deviations: [] })),
}));

import { useTeams } from '@/hooks/useTeams.ts';
import { useTeam } from '@/hooks/useTeam.ts';

describe('TeamsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(useTeams).mockReturnValue({
      teams: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
      createTeam: vi.fn(),
      joinTeam: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading your teams/i)).toBeInTheDocument();
  });

  it('renders empty state when no teams exist', () => {
    vi.mocked(useTeams).mockReturnValue({
      teams: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
      createTeam: vi.fn(),
      joinTeam: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/No Teams Yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy-First Teams/i)).toBeInTheDocument();
  });

  it('renders list of teams when available', () => {
    vi.mocked(useTeams).mockReturnValue({
      teams: [
        {
          id: 'team-123',
          name: 'Eco Squad',
          role: 'owner',
          alias: 'Member 1234',
          sharing: true,
          joinCode: 'ABCDE-FG234',
          targetResource: 'water',
          targetAmount: 1000,
          showLeaderboard: true,
          memberCount: 4,
          createdAt: '2026-09-20T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      reload: vi.fn(),
      createTeam: vi.fn(),
      joinTeam: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Eco Squad')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('View Team')).toBeInTheDocument();
  });

  it('opens create team modal when Create Team button clicked', () => {
    vi.mocked(useTeams).mockReturnValue({
      teams: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
      createTeam: vi.fn(),
      joinTeam: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    const createBtn = screen.getByRole('button', { name: /Create Team/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Create a New Team')).toBeInTheDocument();
    expect(screen.getByLabelText(/Team Name/i)).toBeInTheDocument();
  });
});

describe('TeamDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders team detail summary and leaderboard when available', () => {
    vi.mocked(useTeam).mockReturnValue({
      team: {
        id: 'team-123',
        name: 'Eco Squad',
        role: 'owner',
        alias: 'Member 1234',
        sharing: true,
        joinCode: 'ABCDEF2345',
        targetResource: 'water',
        targetAmount: 1000,
        showLeaderboard: true,
        memberCount: 4,
        createdAt: '2026-09-20T10:00:00Z',
      },
      summary: {
        memberCount: 4,
        sharingCount: 3,
        visible: true,
        daysWindow: 30,
        totalWaterSavedL: 450,
        totalEnergySavedKwh: 22.5,
        targetResource: 'water',
        targetAmount: 1000,
        targetProgress: 0.45,
      },
      members: [
        {
          memberId: 'm1',
          alias: 'Member 1234',
          role: 'owner',
          sharing: true,
          joinedAt: '2026-09-20T10:00:00Z',
        },
        {
          memberId: 'm2',
          alias: 'Member 5678',
          role: 'member',
          sharing: true,
          joinedAt: '2026-09-20T10:05:00Z',
        },
        {
          memberId: 'm3',
          alias: 'Member 9999',
          role: 'member',
          sharing: true,
          joinedAt: '2026-09-20T10:10:00Z',
        },
      ],
      leaderboard: [
        { rank: 1, alias: 'Member 5678', pctWater: 15, pctEnergy: 15, pctOverall: 15, daysCounted: 30, isMe: false },
        { rank: 2, alias: 'Member 1234', pctWater: 10, pctEnergy: 10, pctOverall: 10, daysCounted: 30, isMe: true },
        { rank: 3, alias: 'Member 9999', pctWater: 5, pctEnergy: 5, pctOverall: 5, daysCounted: 30, isMe: false },
      ],
      isLoading: false,
      error: null,
      reload: vi.fn(),
      updateMembership: vi.fn(),
      updateSettings: vi.fn(),
      rotateCode: vi.fn(),
      removeMember: vi.fn(),
      leaveTeam: vi.fn(),
      deleteTeam: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/teams/team-123']}>
        <Routes>
          <Route path="/teams/:teamId" element={<TeamDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Eco Squad')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
    expect(screen.getByText('22.5')).toBeInTheDocument();
    expect(screen.getByText('30-Day Leaderboard')).toBeInTheDocument();
  });
});
