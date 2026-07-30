import { DEFAULT_LOCALE } from '@/config/locale';

export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Local calendar day as `YYYY-MM-DD`.
 *
 * Not `toISOString().slice(0, 10)`: that converts to UTC first, so any evening
 * west of Greenwich lands on the following day. Date filters are compared
 * against this key, so it has to be the day the user is actually living in.
 */
export function toDateKey(value: DateInput): string {
  const date = toDate(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Reads back a `toDateKey` value as local midnight rather than UTC midnight. */
export function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function formatLongDate(value: DateInput, locale = DEFAULT_LOCALE): string {
  return toDate(value).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(value: DateInput, locale = DEFAULT_LOCALE): string {
  return toDate(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(value: DateInput, locale = DEFAULT_LOCALE): string {
  return toDate(value).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMonthYear(value: DateInput, locale = DEFAULT_LOCALE): string {
  return toDate(value).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/** Month names in calendar order, index 0 = January. */
export function getMonthNames(locale = DEFAULT_LOCALE): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: 'long' });
  return Array.from({ length: 12 }, (_, month) => format.format(new Date(2024, month, 1)));
}

/** Weekday names, index 0 = Sunday, to line up with `Date.prototype.getDay`. */
export function getWeekdayNames(locale = DEFAULT_LOCALE): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2024-09-01 was a Sunday.
  return Array.from({ length: 7 }, (_, day) => format.format(new Date(2024, 8, 1 + day)));
}

export function formatNumber(value: number, locale = DEFAULT_LOCALE): string {
  return value.toLocaleString(locale);
}

/**
 * Keeps the sign visible: a ledger delta of `+12` reads differently from `12`,
 * and an adjustment is only legible when the direction is on the number itself.
 */
export function formatSignedNumber(value: number, locale = DEFAULT_LOCALE): string {
  return value > 0 ? `+${formatNumber(value, locale)}` : formatNumber(value, locale);
}

/**
 * Returns the noun, not the phrase: `${count} ${pluralize(count, 'bottle')}`.
 * Keeping the count out means call sites that render it separately — inside a
 * styled span, say — do not have to build the plural by hand.
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
