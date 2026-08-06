'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { LanguageSwitcher } from '@/i18n';

/**
 * Who is signed in and what they can do about it.
 *
 * Shared by the desktop account menu and the phone's overflow sheet: the two are
 * the same list in two containers, and written twice they would drift the first
 * time something is added to one of them.
 *
 * `onNavigate` closes whatever is holding it — a client navigation leaves both
 * the popover and the sheet mounted, so neither closes on its own.
 */
export function AccountActions({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations('nav.account');
  const tRoles = useTranslations('admin.roles');
  const { user, signOut } = useAuth();

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
        <p className="truncate text-xs text-contrast/60">{user?.email}</p>
        <p className="text-xs uppercase tracking-wider text-accent/80">
          {user && tRoles(user.role)}
        </p>
      </div>

      <LanguageSwitcher />

      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link href={ROUTES.profile} onClick={onNavigate}>
            {t('profile')}
          </Link>
        </Button>
        {/* The logo goes to the dashboard, as it should inside a product, which
            left the public site with no way back to it. */}
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link href={ROUTES.home} onClick={onNavigate}>
            {t('landing')}
          </Link>
        </Button>
        <Button variant="secondary" size="sm" className="w-full" onClick={() => void signOut()}>
          {t('signOut')}
        </Button>
      </div>
    </div>
  );
}
