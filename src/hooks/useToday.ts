import { useMemo } from 'react';

export type ClockFunction = () => Date;

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 * Supports dependency injection via the `clock` parameter for deterministic testing.
 */
export function useToday(clock: ClockFunction = () => new Date()): { today: string; now: Date } {
  return useMemo(() => {
    const now = clock();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      today: `${year}-${month}-${day}`,
      now,
    };
  }, [clock]);
}
