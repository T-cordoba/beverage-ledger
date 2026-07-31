'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button, Card, Spinner } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useGoogleCallback } from '@/features/auth';

/**
 * Where the API sends the browser back after Google.
 *
 * It arrives with the refresh cookie already set and no token in the URL, so
 * the only thing left to do is trade the cookie for one.
 */
export default function GoogleCallbackPage() {
  const t = useTranslations('auth.callback');
  const { failed } = useGoogleCallback();

  if (failed) {
    return (
      <Card className="space-y-4 p-6 text-center sm:p-8">
        <h1 className="text-xl font-light text-foreground">{t('failedTitle')}</h1>
        <p className="text-sm text-contrast/60">{t('failedDescription')}</p>
        <Button asChild>
          <Link href={ROUTES.signIn}>{t('backToSignIn')}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <Spinner size="lg" label={t('completing')} />
      <p className="text-sm text-contrast/60">{t('completing')}</p>
    </Card>
  );
}
