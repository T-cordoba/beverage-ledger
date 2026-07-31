import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui';
import { RegisterForm } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register');
  return { title: t('title') };
}

export default function RegisterPage() {
  const t = useTranslations('auth.register');

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-6 text-xl font-light text-foreground">{t('title')}</h1>
      <RegisterForm />
    </Card>
  );
}
