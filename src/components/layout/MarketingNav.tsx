'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { BRAND } from '@/config/branding';
import { MARKETING_SECTIONS, ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { LanguageSwitcher } from '@/i18n';

export function MarketingNav() {
  const t = useTranslations('marketing.nav');
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-sticky border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex shrink-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a static asset, not a remote upload */}
          <img src={BRAND.logoSrc} alt="" className="h-9 w-auto" aria-hidden="true" />
          <span className="text-sm font-light text-foreground">{BRAND.name}</span>
        </Link>

        <nav aria-label={t('label')} className="hidden flex-1 items-center gap-1 md:flex">
          {MARKETING_SECTIONS.map((section) => (
            <Button key={section} variant="ghost" size="sm" asChild className="rounded-lg">
              <a href={`#${section}`}>{t(section)}</a>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LanguageSwitcher className="hidden w-32 sm:flex" />

          {/* Until the session resolves this shows the signed-out pair, which is
              what a first visit is: no spinner for a decision nobody is waiting on. */}
          {isAuthenticated ? (
            <Button size="sm" asChild>
              <Link href={ROUTES.dashboard}>{t('dashboard')}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.signIn}>{t('signIn')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={ROUTES.signUp}>{t('signUp')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
