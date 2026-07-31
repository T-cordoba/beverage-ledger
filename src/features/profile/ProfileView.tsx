'use client';

import { useTranslations } from 'next-intl';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileDetailsForm } from './ProfileDetailsForm';

export function ProfileView() {
  const t = useTranslations('profile');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-contrast/60">{t('subtitle')}</p>
      </header>

      <ProfileDetailsForm />

      <section className="space-y-3">
        <h2 className="text-lg font-light text-foreground">{t('password.title')}</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
