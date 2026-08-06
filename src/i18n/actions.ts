'use server';

import { cookies } from 'next/headers';
import {
  isTimeZone,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  TIMEZONE_COOKIE,
  TIMEZONE_COOKIE_MAX_AGE,
  type Locale,
} from './config';

/**
 * Persists the language choice. The caller refreshes afterwards: the messages
 * are handed down by the root layout, so only a new server render carries them.
 */
export async function setLocale(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
}

/**
 * Persists the zone the browser reported. Nothing decides on this value but the
 * date formatter, so an unknown one is dropped rather than raised: the fallback
 * zone is a worse reading, not a broken page.
 */
export async function setTimeZone(timeZone: string): Promise<void> {
  if (!isTimeZone(timeZone)) {
    return;
  }

  (await cookies()).set(TIMEZONE_COOKIE, timeZone, {
    maxAge: TIMEZONE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
}
