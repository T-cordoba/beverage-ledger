import type { Locale } from './config';
import type { formats } from './formats';
import type messages from './messages/es.json';

/**
 * Types every `t('…')` and every named format against the Spanish catalogue,
 * which is the source language: a key that does not exist stops the build
 * instead of rendering its own path on screen. English is checked against it by
 * `pnpm i18n:check`.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
    Formats: typeof formats;
  }
}
