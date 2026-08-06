import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import {
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
  isLocale,
  isTimeZone,
  LOCALE_COOKIE,
  TIMEZONE_COOKIE,
} from './config';
import { formats } from './formats';

/**
 * The locale comes from a cookie rather than from the URL: every route of the
 * product sits behind the auth guard and renders in the browser, so an `/en`
 * prefix would buy nothing but a move of all 25 routes under `[locale]/`. The
 * upgrade path stays open — see CLAUDE.md §9.
 *
 * Reading the cookie opts every page into dynamic rendering, the landing
 * included. Nothing here was cacheable across users anyway.
 */
export default getRequestConfig(async () => {
  const jar = await cookies();
  const cookie = jar.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;

  // Without an explicit zone next-intl formats in the host's, which on Vercel is
  // UTC, so every timestamp read hours off. The zone is the browser's, written
  // to a cookie by TimeZoneSync — the organization's would be right for a report
  // and wrong for "when did I do this".
  const timeZone = jar.get(TIMEZONE_COOKIE)?.value;

  return {
    locale,
    formats,
    timeZone: isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
