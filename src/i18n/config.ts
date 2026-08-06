export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** Spanish is the product's first language; English is the translation. */
export const DEFAULT_LOCALE: Locale = 'es';

/**
 * Not `NEXT_LOCALE`: that name belongs to Next's own locale detection, which is
 * off here, and reusing it would make the two look connected.
 */
export const LOCALE_COOKIE = 'bl_locale';

/** A year: the choice is a preference, not a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Each label is written in its own language — that is how a reader finds it. */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Where the browser says it is. Written by TimeZoneSync and read on the server,
 * because a timestamp formatted on the server and re-formatted on the client has
 * to come out the same or React tears the hydration apart.
 */
export const TIMEZONE_COOKIE = 'bl_tz';

/** A year, like the language: it is where the user works, not a session. */
export const TIMEZONE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The zone used for the first render of a visitor who has no cookie yet, until
 * the browser reports its own. UTC and not a guessed offset: an hour that is
 * plainly a reference reads as one, while a plausible wrong local time does not.
 */
export const DEFAULT_TIME_ZONE = 'UTC';

/**
 * Cookies come from the client, so the value has to be proven usable before it
 * reaches `Intl` — an unknown zone throws a RangeError, and here that would take
 * down every page instead of one date.
 */
export function isTimeZone(value: string | undefined | null): value is string {
  if (!value) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en', { timeZone: value });

    return true;
  } catch {
    return false;
  }
}
