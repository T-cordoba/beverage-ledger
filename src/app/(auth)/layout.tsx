import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/branding';
import { LanguageSwitcher } from '@/i18n';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset, not a remote upload */}
          <img src={BRAND.logoSrc} alt={BRAND.name} className="h-20 w-auto" />
          <p className="text-sm font-light text-contrast/70">{t('tagline')}</p>
        </div>

        {children}

        <div className="flex justify-center">
          <LanguageSwitcher className="w-40" />
        </div>
      </div>
    </div>
  );
}
