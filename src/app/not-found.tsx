'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { StatusScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';

/**
 * A client component because the way out depends on the session, and the
 * session only exists in the browser: the refresh cookie never reaches the
 * Next server, so nothing here could be decided while rendering on it.
 */
export default function NotFound() {
  const t = useTranslations('errors.notFound');
  const { isAuthenticated } = useAuth();

  return (
    <StatusScreen code="404" title={t('title')} description={t('description')}>
      {isAuthenticated ? (
        <Button size="lg" asChild>
          <Link href={ROUTES.dashboard}>{t('backToDashboard')}</Link>
        </Button>
      ) : (
        <Button size="lg" asChild>
          <Link href={ROUTES.home}>{t('backHome')}</Link>
        </Button>
      )}
    </StatusScreen>
  );
}
