import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalCard } from './GoalCard';
import type { GoalWithProgress } from '@/hooks/useGoals';

const mockGoalItem: GoalWithProgress = {
  goal: {
    id: 'goal-123',
    userId: 'user-1',
    resource: 'water',
    period: 'month',
    targetAmount: 180,
    startDate: '2026-09-01',
    status: 'active',
    referenceProfile: {
      householdSize: 2,
      showerMinutesPerDay: 10,
      showerHeater: 'electric',
      acHoursPerDay: 4,
      fanHoursPerDay: 8,
      laptopHoursPerDay: 8,
      laundryLoadsPerWeek: 3,
      laundryMachine: 'topLoad',
      factorsVersion: '1.0.0',
      effectiveFrom: '2026-09-01',
    },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  progress: {
    windowStart: '2026-09-01',
    windowEnd: '2026-09-30',
    daysCounted: 30,
    unavailableDays: [],
    saved: { low: 150, typical: 200, high: 250 },
    target: 180,
    ratioTypical: 1.11,
    pace: { low: 150, typical: 200, high: 250 },
    householdChanged: false,
    status: 'achieved',
    confirmedAtCautiousEstimate: true,
  },
};

describe('GoalCard Component', () => {
  it('renders goal details and progress bar with proper ARIA attributes', () => {
    render(
      <GoalCard
        goal={mockGoalItem}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/Water Goal: Reduce 180 L\/month/i)).toBeInTheDocument();
    expect(screen.getByText(/Window: 2026-09-01 to 2026-09-30/i)).toBeInTheDocument();

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows calm celebration banner when goal target is reached', () => {
    render(
      <GoalCard
        goal={mockGoalItem}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Reduction target achieved!')).toBeInTheDocument();
  });

  it('triggers confirmation dialog on archive button click', async () => {
    const onArchive = vi.fn().mockResolvedValue(undefined);
    render(
      <GoalCard
        goal={mockGoalItem}
        onArchive={onArchive}
        onDelete={vi.fn()}
      />
    );

    const archiveBtn = screen.getByRole('button', { name: /Archive Water goal/i });
    fireEvent.click(archiveBtn);

    expect(screen.getByText('Confirm Archiving')).toBeInTheDocument();
    
    const confirmBtn = screen.getByRole('button', { name: 'Archive Goal' });
    fireEvent.click(confirmBtn);

    expect(onArchive).toHaveBeenCalledWith('goal-123');
  });
});
