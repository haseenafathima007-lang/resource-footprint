import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToday } from './useToday.ts';

describe('useToday', () => {
  it('returns formatted local date from injected clock', () => {
    const fixedDate = new Date(2026, 6, 15, 14, 30, 0); // July 15, 2026
    const { result } = renderHook(() => useToday(() => fixedDate));
    expect(result.current.today).toBe('2026-07-15');
    expect(result.current.now).toBe(fixedDate);
  });

  it('pads single digit month and day with zero', () => {
    const fixedDate = new Date(2026, 0, 5); // January 5, 2026
    const { result } = renderHook(() => useToday(() => fixedDate));
    expect(result.current.today).toBe('2026-01-05');
  });

  it('works with default clock without crashing', () => {
    const { result } = renderHook(() => useToday());
    expect(result.current.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.now).toBeInstanceOf(Date);
  });
});
