import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from './config';
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
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;

  return {
    locale,
    formats,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
