export type DateInput = Date | string | number;

/**
 * Local calendar day as `YYYY-MM-DD`.
 *
 * Not `toISOString().slice(0, 10)`: that converts to UTC first, so any evening
 * west of Greenwich lands on the following day. Date filters are compared
 * against this key, so it has to be the day the user is actually living in.
 */
export function toDateKey(value: DateInput): string {
  const date = value instanceof Date ? value : new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Reads back a `toDateKey` value as local midnight rather than UTC midnight. */
export function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

/**
 * Month names in calendar order, index 0 = January.
 *
 * Dates and numbers go through `useFormatter`, but the calendar needs the names
 * as a list rather than as a formatted date, and next-intl has no equivalent.
 */
export function getMonthNames(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: 'long' });
  return Array.from({ length: 12 }, (_, month) => format.format(new Date(2024, month, 1)));
}

/** Weekday names, index 0 = Sunday, to line up with `Date.prototype.getDay`. */
export function getWeekdayNames(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2024-09-01 was a Sunday.
  return Array.from({ length: 7 }, (_, day) => format.format(new Date(2024, 8, 1 + day)));
}
