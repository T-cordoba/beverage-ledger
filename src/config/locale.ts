/**
 * Locale used by every formatter.
 *
 * TODO(phase-7): next-intl takes over and the locale comes from the request,
 * with `es` as the default. Until then this constant is the only place that
 * decides it — before, 'en-US' was repeated across six call sites.
 */
export const DEFAULT_LOCALE = 'en-US';
