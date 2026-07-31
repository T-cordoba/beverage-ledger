import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/branding';
import { ROUTES } from '@/config/navigation';
import { LanguageSwitcher } from '@/i18n';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6 text-foreground">
      {/* Signing in is a dead end otherwise: this group is outside the marketing
          nav, so without a way back the only route to the public site is the
          browser's own. */}
      <Link
        href={ROUTES.home}
        className="inline-flex items-center gap-2 self-start rounded-lg px-2 py-1 text-sm text-contrast/60 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t('backToSite')}
      </Link>

      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md space-y-8">
          <Link href={ROUTES.home} className="flex flex-col items-center gap-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static asset, not a remote upload */}
            <img src={BRAND.logoSrc} alt={BRAND.name} className="h-20 w-auto" />
            <span className="text-sm font-light text-contrast/70">{t('tagline')}</span>
          </Link>

          {children}

          <div className="flex justify-center">
            <LanguageSwitcher className="w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
