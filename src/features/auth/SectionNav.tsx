'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import { visibleNavigation, type NavigationItem, type NavigationLabel } from '@/config/navigation';
import { useAuth } from './auth-context';
import { cn } from '@/lib/utils';

/**
 * Tabs across the pages of one section, each shown only to a session that can
 * open it. A single visible tab is no choice at all, so then it renders nothing.
 */
export function SectionNav({
  items: all,
  label,
}: Readonly<{ items: NavigationItem[]; label: NavigationLabel }>) {
  const t = useTranslations('nav');
  const { can } = useAuth();
  const pathname = usePathname();
  const items = visibleNavigation(all, can);

  if (items.length <= 1) return null;

  return (
    <nav
      aria-label={t(`items.${label}`)}
      className="flex flex-wrap gap-1 border-b border-border pb-3"
    >
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
