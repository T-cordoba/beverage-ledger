'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect } from 'react';
import { StatusScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { ROUTES } from '@/config/navigation';

/**
 * Catches anything a view throws while rendering. Without it a single bad
 * render shows Next's own screen, which in production says nothing at all.
 *
 * `reset` re-renders the segment: enough for a transient failure, and the link
 * home is what is left when it is not transient.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors.unexpected');

  useEffect(() => {
    // The digest is all the server keeps; without it a report is unmatchable.
    console.error('Unhandled render error', error);
  }, [error]);

  return (
    <StatusScreen title={t('title')} description={t('description')}>
      <Button size="lg" onClick={reset}>
        {t('retry')}
      </Button>
      <Button variant="secondary" size="lg" asChild>
        <Link href={ROUTES.home}>{t('backHome')}</Link>
      </Button>
    </StatusScreen>
  );
}
