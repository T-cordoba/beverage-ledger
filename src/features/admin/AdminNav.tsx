'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import { ADMIN_NAVIGATION, visibleNavigation } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';

/** Sub-navigation for the admin area. Each page is behind its own permission. */
export function AdminNav() {
  const t = useTranslations('nav');
  const { can } = useAuth();
  const pathname = usePathname();
  const items = visibleNavigation(ADMIN_NAVIGATION, can);

  if (items.length <= 1) return null;

  return (
    <nav aria-label={t('items.admin')} className="flex flex-wrap gap-1 border-b border-border pb-3">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            asChild
            className={cn('rounded-lg', isActive ? 'bg-accent/10 text-accent' : 'text-contrast/70')}
          >
            <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
              {t(`items.${item.label}`)}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
