'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { MouseEvent } from 'react';

/**
 * "Back" that returns to wherever the user came from, which is not always the
 * obvious parent: a movement can be opened from the dashboard as well as from
 * the history. `href` is where it goes when there is nothing to go back to — a
 * link opened in a new tab.
 */
export function BackLink({ href }: Readonly<{ href: string }>) {
  const t = useTranslations('common.actions');

  const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.history.length <= 1) return;
    event.preventDefault();
    window.history.back();
  };

  return (
    <Link href={href} onClick={goBack} className="text-sm text-contrast/60 hover:text-accent">
      ← {t('back')}
    </Link>
  );
}
