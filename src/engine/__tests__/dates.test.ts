import { describe, it, expect } from 'vitest';
import {
  isValidISODate,
  addDays,
  daysBetween,
  eachDay,
  compareISO,
  toISODate,
} from '../dates.ts';

describe('dates engine module', () => {
  describe('isValidISODate', () => {
    it('accepts valid calendar dates', () => {
      expect(isValidISODate('2026-01-01')).toBe(true);
      expect(isValidISODate('2026-12-31')).toBe(true);
      expect(isValidISODate('2024-02-29')).toBe(true); // Leap year
      expect(isValidISODate('2028-02-29')).toBe(true); // Leap year
    });

    it('rejects invalid calendar dates and leap year violations', () => {
      expect(isValidISODate('2026-02-29')).toBe(false); // 2026 not leap
      expect(isValidISODate('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidISODate('2026-13-01')).toBe(false); // Invalid month
      expect(isValidISODate('2026-00-10')).toBe(false);
      expect(isValidISODate('2026-05-00')).toBe(false);
      expect(isValidISODate('2026-05-32')).toBe(false);
    });

    it('rejects malformed or non-string inputs', () => {
      expect(isValidISODate('')).toBe(false);
      expect(isValidISODate('2026/01/01')).toBe(false);
      expect(isValidISODate('2026-1-1')).toBe(false);
      expect(isValidISODate('tomorrow')).toBe(false);
      expect(isValidISODate(null as unknown as string)).toBe(false);
      expect(isValidISODate(undefined as unknown as string)).toBe(false);
      expect(isValidISODate(12345 as unknown as string)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('adds and subtracts days within the same month', () => {
      expect(addDays('2026-03-10', 5)).toBe('2026-03-15');
      expect(addDays('2026-03-10', -3)).toBe('2026-03-07');
      expect(addDays('2026-03-10', 0)).toBe('2026-03-10');
    });

    it('handles month boundaries and year transitions', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    });

    it('handles leap year boundaries correctly', () => {
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
      expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    });

    it('throws when given an invalid date', () => {
      expect(() => addDays('invalid', 5)).toThrowError(/Invalid ISO date/);
    });
  });

  describe('daysBetween', () => {
    it('returns 0 for the same date', () => {
      expect(daysBetween('2026-05-10', '2026-05-10')).toBe(0);
    });

    it('returns positive differences forward in time', () => {
      expect(daysBetween('2026-05-10', '2026-05-15')).toBe(5);
      expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    });

    it('returns negative differences backward in time', () => {
      expect(daysBetween('2026-05-15', '2026-05-10')).toBe(-5);
    });

    it('correctly accounts for leap days in difference', () => {
      // 2024 is a leap year (Feb has 29 days)
      expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
      // 2026 is non-leap (Feb has 28 days)
      expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    });

    it('is immune to Daylight Saving Time (DST) shifts', () => {
      // In US/Eastern, DST begins on 2026-03-08 (clocks forward 1 hour)
      // 2026-03-07 to 2026-03-09 must be exactly 2 days
      expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
      // European DST begins on 2026-03-29
      expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    });

    it('throws when either date is invalid', () => {
      expect(() => daysBetween('2026-01-01', 'bad')).toThrowError(/Invalid ISO date/);
      expect(() => daysBetween('bad', '2026-01-01')).toThrowError(/Invalid ISO date/);
    });
  });

  describe('eachDay', () => {
    it('returns array of dates inclusive', () => {
      const dates = eachDay('2026-06-29', '2026-07-02');
      expect(dates).toEqual([
        '2026-06-29',
        '2026-06-30',
        '2026-07-01',
        '2026-07-02',
      ]);
      expect(dates.length).toBe(4);
    });

    it('returns single day array when start === end', () => {
      expect(eachDay('2026-08-15', '2026-08-15')).toEqual(['2026-08-15']);
    });

    it('returns empty array when end < start', () => {
      expect(eachDay('2026-08-15', '2026-08-10')).toEqual([]);
    });

    it('throws when dates are invalid', () => {
      expect(() => eachDay('bad', '2026-01-01')).toThrowError(/Invalid ISO date/);
    });
  });

  describe('compareISO', () => {
    it('returns -1, 0, or 1 correctly', () => {
      expect(compareISO('2026-01-01', '2026-01-02')).toBe(-1);
      expect(compareISO('2026-05-15', '2026-05-15')).toBe(0);
      expect(compareISO('2026-10-20', '2026-09-20')).toBe(1);
    });

    it('throws for invalid dates', () => {
      expect(() => compareISO('invalid', '2026-01-01')).toThrowError(/Invalid ISO date/);
    });
  });

  describe('toISODate', () => {
    it('formats a Date object using UTC', () => {
      const d = new Date(Date.UTC(2026, 8, 20, 15, 30, 0));
      expect(toISODate(d)).toBe('2026-09-20');
    });

    it('formats epoch timestamp using UTC', () => {
      const ts = Date.UTC(2026, 0, 15, 12, 0, 0);
      expect(toISODate(ts)).toBe('2026-01-15');
    });

    it('returns valid string directly', () => {
      expect(toISODate('2026-11-05')).toBe('2026-11-05');
    });

    it('converts full ISO datetime string to date', () => {
      expect(toISODate('2026-11-05T14:20:00Z')).toBe('2026-11-05');
    });

    it('throws for invalid input', () => {
      expect(() => toISODate('garbage')).toThrowError(/Invalid date/);
      expect(() => toISODate(new Date('invalid'))).toThrowError(/Invalid Date/);
    });
  });
});
