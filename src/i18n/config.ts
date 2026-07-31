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
