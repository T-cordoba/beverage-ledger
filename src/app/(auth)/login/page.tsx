import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Card, Spinner } from '@/components/ui';
import { LoginForm } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signIn');
  return { title: t('title') };
}

export default function LoginPage() {
  const t = useTranslations('auth.signIn');

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-6 text-xl font-light text-foreground">{t('title')}</h1>
      {/* The form reads ?next= to return the user where they were headed. */}
      <Suspense fallback={<Spinner label={t('loadingForm')} />}>
        <LoginForm />
      </Suspense>
    </Card>
  );
}
