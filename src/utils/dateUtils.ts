/**
 * ASCEND Date & Time Utilities
 * Provides timezone-safe local calendar date handling (YYYY-MM-DD)
 * to prevent UTC drift and date synchronization bugs.
 */

/**
 * Returns a local calendar date string in YYYY-MM-DD format.
 * Uses local time components (getFullYear, getMonth, getDate),
 * preventing UTC rollover issues (e.g., 11:30 PM local being treated as tomorrow in UTC).
 */
export function getLocalDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates a local date offset by N days from a base date.
 */
export function getDateWithOffset(offsetDays: number, baseDate: Date = new Date()): {
  date: Date;
  dateIso: string;
  dayName: string;
  formattedDate: string;
  displayLabel: string;
} {
  const target = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + offsetDays
  );
  const dateIso = getLocalDateIso(target);
  const dayName =
    offsetDays === 0
      ? 'Today'
      : offsetDays === -1
      ? 'Yesterday'
      : offsetDays === 1
      ? 'Tomorrow'
      : target.toLocaleDateString('en-US', { weekday: 'short' });
  const formattedDate = target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return {
    date: target,
    dateIso,
    dayName,
    formattedDate,
    displayLabel: `${dayName}, ${formattedDate}`,
  };
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a human-readable local date string.
 */
export function formatIsoDate(
  dateIso: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateIso) return '';
  const parts = dateIso.split('-');
  if (parts.length !== 3) return dateIso;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return d.toLocaleDateString(
    'en-US',
    options ?? { month: 'short', day: 'numeric', year: 'numeric' }
  );
}

/**
 * Checks whether two ISO date strings represent the same day.
 */
export function isSameDateIso(dateIso1: string, dateIso2: string): boolean {
  return dateIso1 === dateIso2;
}

/**
 * Returns an array of the last N days as ISO strings [earliest, ..., today].
 */
export function getPastNDaysIso(n: number, baseDate: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() - i
    );
    result.push(getLocalDateIso(d));
  }
  return result;
}
