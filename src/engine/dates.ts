/**
 * Pure UTC date-string utilities (YYYY-MM-DD).
 * Never uses local-time Date methods to prevent timezone drift and DST shifts.
 */

const ISO_DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * Validates whether a string is a strictly valid calendar date in YYYY-MM-DD format.
 */
export function isValidISODate(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !ISO_DATE_REGEX.test(dateStr)) {
    return false;
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Adds an integer number of days to an ISO date string using UTC arithmetic.
 */
export function addDays(isoDate: string, days: number): string {
  if (!isValidISODate(isoDate)) {
    throw new Error(`Invalid ISO date string provided to addDays: "${isoDate}"`);
  }

  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));

  const resY = dt.getUTCFullYear();
  const resM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(dt.getUTCDate()).padStart(2, '0');

  return `${resY}-${resM}-${resD}`;
}

/**
 * Returns the signed integer difference in days between two ISO dates (end - start).
 */
export function daysBetween(startIso: string, endIso: string): number {
  if (!isValidISODate(startIso) || !isValidISODate(endIso)) {
    throw new Error(`Invalid ISO date provided to daysBetween: "${startIso}", "${endIso}"`);
  }

  const [y1, m1, d1] = startIso.split('-').map(Number);
  const [y2, m2, d2] = endIso.split('-').map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const MS_PER_DAY = 86_400_000;
  return Math.round((utc2 - utc1) / MS_PER_DAY);
}

/**
 * Returns an array of ISO date strings for each day in [startIso, endIso] inclusive.
 * If endIso < startIso, returns an empty array.
 */
export function eachDay(startIso: string, endIso: string): string[] {
  if (!isValidISODate(startIso) || !isValidISODate(endIso)) {
    throw new Error(`Invalid ISO date provided to eachDay: "${startIso}", "${endIso}"`);
  }

  const daysDiff = daysBetween(startIso, endIso);
  if (daysDiff < 0) {
    return [];
  }

  const result: string[] = [];
  let current = startIso;
  for (let i = 0; i <= daysDiff; i++) {
    result.push(current);
    if (i < daysDiff) {
      current = addDays(current, 1);
    }
  }

  return result;
}

/**
 * Compares two ISO date strings lexicographically (-1 if a < b, 0 if a === b, 1 if a > b).
 */
export function compareISO(a: string, b: string): number {
  if (!isValidISODate(a) || !isValidISODate(b)) {
    throw new Error(`Invalid ISO date provided to compareISO: "${a}", "${b}"`);
  }

  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Converts a Date, epoch timestamp, or date string into a YYYY-MM-DD ISO string using UTC values.
 */
export function toISODate(dateLike: Date | string | number): string {
  if (typeof dateLike === 'string') {
    const trimmed = dateLike.trim();
    if (isValidISODate(trimmed)) {
      return trimmed;
    }
    const dt = new Date(trimmed);
    if (isNaN(dt.getTime())) {
      throw new Error(`Invalid date provided to toISODate: "${dateLike}"`);
    }
    return formatUtc(dt);
  }

  if (dateLike instanceof Date) {
    if (isNaN(dateLike.getTime())) {
      throw new Error('Invalid Date object provided to toISODate');
    }
    return formatUtc(dateLike);
  }

  if (typeof dateLike === 'number') {
    const dt = new Date(dateLike);
    if (isNaN(dt.getTime())) {
      throw new Error(`Invalid timestamp provided to toISODate: ${dateLike}`);
    }
    return formatUtc(dt);
  }

  throw new Error(`Unsupported type passed to toISODate: ${typeof dateLike}`);
}

function formatUtc(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
