// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MethodologyPage } from './MethodologyPage.tsx';

describe('MethodologyPage Component', () => {
  it('renders all 7 anchor sections and navigation links', () => {
    render(
      <MemoryRouter>
        <MethodologyPage />
      </MemoryRouter>
    );

    // Page title and H1
    expect(screen.getByRole('heading', { level: 1, name: /how we calculate your resource footprint/i })).toBeDefined();

    // 7 Sections headings
    expect(screen.getByRole('heading', { level: 2, name: /core principles/i })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: /conversion factors repository/i })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: /activity calculation models/i })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: /live default profile worked example/i })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: /sustainability score formula & anchors/i })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: /deviations & multi-baseline history/i })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: /scope, boundaries & limits/i })).toBeDefined();
  });

  it('renders live default profile worked example with hand-computed arithmetic values', () => {
    render(
      <MemoryRouter>
        <MethodologyPage />
      </MemoryRouter>
    );

    // Daily Water (~160 L / day, exact 164.29 L)
    expect(screen.getByText('Exact: 164.29 L')).toBeDefined();
    expect(screen.getByText('~160')).toBeDefined();

    // Daily Energy (~8.7 kWh / day, exact 8.70 kWh)
    expect(screen.getByText('Exact: 8.70 kWh')).toBeDefined();
    expect(screen.getByText('~8.7')).toBeDefined();

    // Hand arithmetic breakdown rows
    expect(screen.getByText('90.00 L')).toBeDefined(); // Shower water
    expect(screen.getByText('74.29 L')).toBeDefined(); // Laundry water
    expect(screen.getByText('2.6145 kWh')).toBeDefined(); // Shower heating
    expect(screen.getByText('5.2000 kWh')).toBeDefined(); // AC
    expect(screen.getByText('0.3900 kWh')).toBeDefined(); // Fan
    expect(screen.getByText('0.2700 kWh')).toBeDefined(); // Laptop
    expect(screen.getByText('0.2286 kWh')).toBeDefined(); // Laundry electric
  });

  it('allows searching and filtering factors in the conversion factors table', () => {
    render(
      <MemoryRouter>
        <MethodologyPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText(/search conversion factors/i);
    expect(searchInput).toBeDefined();

    // Search for shower
    fireEvent.change(searchInput, { target: { value: 'shower' } });
    expect(screen.getByText('shower.flow')).toBeDefined();
    expect(screen.queryByText('ac.power')).toBeNull();

    // Search for non-existent term
    fireEvent.change(searchInput, { target: { value: 'nonexistenttermxyz' } });
    expect(screen.getByText(/no conversion factors match your search criteria/i)).toBeDefined();
  });

  it('displays score anchor points and limits disclosure', () => {
    render(
      <MemoryRouter>
        <MethodologyPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Zero Consumption \(0 L, 0 kWh\):/)).toBeDefined();
    expect(screen.getByText(/Reference Benchmark \(250 L, 6 kWh\):/)).toBeDefined();
    expect(screen.getByText(/Embodied & Industrial Water:/)).toBeDefined();
    expect(screen.getByText(/Transportation:/)).toBeDefined();
  });
});
