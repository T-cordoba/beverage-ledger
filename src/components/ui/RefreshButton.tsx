'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Asks a list to fetch again.
 *
 * Every table in the product reads a projection somebody else can move — another
 * operator confirms a movement, an admin renames a product — and the cache has
 * no way to hear about it. A tab left open goes stale in silence, and reloading
 * the whole page to find out costs the filters and the page you were on.
 *
 * Icon only, with the label read out instead of drawn: it repeats on nine
 * screens beside a heading that already says what is being refreshed.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  className,
}: {
  onRefresh: () => void;
  isRefreshing?: boolean;
  className?: string;
}) {
  const t = useTranslations('common.actions');

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label={t('refresh')}
      title={t('refresh')}
      className={cn('shrink-0', className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
      >
        <path d="M20 11a8 8 0 0 0-13.7-5.7L3 8.5" />
        <path d="M4 13a8 8 0 0 0 13.7 5.7L21 15.5" />
        <path d="M3 4v4.5h4.5" />
        <path d="M21 20v-4.5h-4.5" />
      </svg>
    </Button>
  );
}
