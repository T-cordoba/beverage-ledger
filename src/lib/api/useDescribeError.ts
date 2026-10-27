import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { isApiError, type ApiError } from './errors';

type ApiErrorKey = Parameters<ReturnType<typeof useTranslations<'errors.api'>>>[0];

function statusKey(status: number): ApiErrorKey {
  if (status === 401) return 'status.unauthorized';
  if (status === 403) return 'status.forbidden';
  if (status === 404) return 'status.notFound';
  if (status === 409) return 'status.conflict';
  if (status === 413) return 'status.tooLarge';
  if (status === 429) return 'status.tooManyRequests';
  if (status >= 500) return 'status.server';
  return 'status.badRequest';
}

/**
 * Turns any failure into a sentence in the user's language.
 *
 * The API's own `message` is English and sometimes names ids or columns, so it
 * is never shown: a known `code` is translated, anything else falls back to a
 * message for its status.
 */
export function useDescribeError() {
  const t = useTranslations('errors.api');

  return useCallback(
    (error: unknown, fallback?: string): string => {
      if (isApiError(error)) return describeApiError(t, error);
      // fetch rejects with a TypeError when the request never reached the server.
      if (error instanceof TypeError) return t('network');
      return fallback ?? t('status.server');
    },
    [t],
  );
}

function describeApiError(t: ReturnType<typeof useTranslations<'errors.api'>>, error: ApiError) {
  const code = error.body?.code;
  const key = `codes.${code}` as ApiErrorKey;

  return code && t.has(key) ? t(key, error.body?.params) : t(statusKey(error.status));
}
