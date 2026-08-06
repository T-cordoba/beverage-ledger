'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { BRAND } from '@/config/branding';
import { MAIN_NAVIGATION, ROUTES, visibleNavigation } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { AccountActions } from './AccountActions';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function Topbar() {
  const t = useTranslations('nav');
  const { user, organization, can } = useAuth();
  const pathname = usePathname();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const items = visibleNavigation(MAIN_NAVIGATION, can);

  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={ROUTES.dashboard} className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a static asset, not a remote upload */}
          <img src={BRAND.logoSrc} alt="" className="h-9 w-auto shrink-0" aria-hidden="true" />
          {/* The tenant's name, not the product's: this ledger is theirs. It
              stays on a phone now that the header holds nothing else. */}
          <span className="truncate text-sm font-light text-foreground">
            {organization?.name ?? BRAND.name}
          </span>
        </Link>

        {/* Below `sm` the bottom bar is the navigation, and a second copy up here
            would be a row of pills nobody can read past the edge of. */}
        <nav aria-label={t('main')} className="hidden flex-1 items-center gap-1 sm:flex">
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

        <Popover open={isAccountOpen} onOpenChange={setIsAccountOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="ml-auto shrink-0 rounded-full"
              aria-label={user ? t('account.menuFor', { name: user.name }) : t('account.menu')}
            >
              <span className="text-xs font-medium">{user ? initialsOf(user.name) : '—'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <AccountActions onNavigate={() => setIsAccountOpen(false)} />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
