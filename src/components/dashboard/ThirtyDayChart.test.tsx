// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThirtyDayChart } from './ThirtyDayChart.tsx';
import type { Dashboard30DayModel } from '@/lib/dashboardModel.ts';

// Mock Recharts ResponsiveContainer
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

const mockModel: Dashboard30DayModel = {
  startDate: '2026-06-11',
  endDate: '2026-07-10',
  days: [
    {
      date: '2026-07-01',
      baselineTotals: {
        water: { low: 100, typical: 150, high: 200 },
        energy: { low: 5, typical: 8, high: 12 },
        waste: { low: 0, typical: 0, high: 0 },
      },
      actualTotals: {
        water: { low: 100, typical: 150, high: 200 },
        energy: { low: 8, typical: 11.9, high: 16 },
        waste: { low: 0, typical: 0, high: 0 },
      },
      difference: {
        water: { low: 0, typical: 0, high: 0 },
        energy: { low: 3, typical: 3.9, high: 4 },
        waste: { low: 0, typical: 0, high: 0 },
      },
      appliedDeviations: [
        {
          id: 'dev-1',
          startDate: '2026-07-01',
          endDate: '2026-07-05',
          field: 'acHoursPerDay',
          mode: 'delta',
          value: 3,
        },
      ],
      clampedFields: [],
      factorsVersion: '1.0.0',
    },
  ],
  totals: {
    baseline: {
      water: { low: 3000, typical: 4500, high: 6000 },
      energy: { low: 150, typical: 240, high: 360 },
      waste: { low: 0, typical: 0, high: 0 },
    },
    actual: {
      water: { low: 3000, typical: 4500, high: 6000 },
      energy: { low: 180, typical: 280, high: 400 },
      waste: { low: 0, typical: 0, high: 0 },
    },
    difference: {
      water: { low: 0, typical: 0, high: 0 },
      energy: { low: 30, typical: 40, high: 40 },
      waste: { low: 0, typical: 0, high: 0 },
    },
  },
  activeDeviations: [
    {
      id: 'dev-1',
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      field: 'acHoursPerDay',
      mode: 'delta',
      value: 3,
      note: 'Summer heatwave',
    },
  ],
  earliestBaselineProjectedBackwards: false,
  earliestBaselineDate: '2026-01-01',
  unavailableDays: [],
};

describe('ThirtyDayChart Component', () => {
  it('renders header, totals, active deviations, and chart', () => {
    render(
      <MemoryRouter>
        <ThirtyDayChart model={mockModel} />
      </MemoryRouter>
    );

    expect(screen.getByText('30-Day Activity & Actuals')).toBeDefined();
    expect(screen.getByText('Summer heatwave:')).toBeDefined();
    expect(screen.getByText('2026-07-01 to 2026-07-05')).toBeDefined();
  });

  it('toggles between chart view and table view on button click', () => {
    render(
      <MemoryRouter>
        <ThirtyDayChart model={mockModel} />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /switch to accessible 30-day table view/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByRole('cell', { name: '2026-07-01' })).toBeDefined();
  });
});
