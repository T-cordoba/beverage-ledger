'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui';
import { BRAND } from '@/config/branding';
import { MAIN_NAVIGATION, ROUTES, visibleNavigation } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { LanguageSwitcher } from '@/i18n';
import { cn } from '@/lib/utils';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function Topbar() {
  const t = useTranslations('nav');
  const { user, organization, can, signOut } = useAuth();
  const pathname = usePathname();

  const items = visibleNavigation(MAIN_NAVIGATION, can);

  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={ROUTES.dashboard} className="flex shrink-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a static asset, not a remote upload */}
          <img src={BRAND.logoSrc} alt="" className="h-9 w-auto" aria-hidden="true" />
          {/* The tenant's name, not the product's: this ledger is theirs. */}
          <span className="hidden text-sm font-light text-foreground sm:inline">
            {organization?.name ?? BRAND.name}
          </span>
        </Link>

        <nav aria-label={t('main')} className="flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  'rounded-lg',
                  isActive ? 'bg-accent/10 text-accent' : 'text-contrast/70',
                )}
              >
                <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                  {t(`items.${item.label}`)}
                </Link>
              </Button>
            );
          })}
        </nav>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="shrink-0 rounded-full"
              aria-label={user ? t('account.menuFor', { name: user.name }) : t('account.menu')}
            >
              <span className="text-xs font-medium">{user ? initialsOf(user.name) : '—'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <div className="space-y-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-contrast/60">{user?.email}</p>
              <p className="text-xs uppercase tracking-wider text-accent/80">{user?.role}</p>
            </div>
            <LanguageSwitcher />
            <div className="space-y-2">
              {/* A client navigation leaves the popover mounted, so it has to be told to close. */}
              <PopoverClose asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                  <Link href={ROUTES.profile}>{t('account.profile')}</Link>
                </Button>
              </PopoverClose>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => void signOut()}
              >
                {t('account.signOut')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
