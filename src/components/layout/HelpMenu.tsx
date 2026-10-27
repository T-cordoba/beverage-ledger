'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Keys,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { SHORTCUTS } from '@/config/shortcuts';
import { useShortcut } from '@/lib/hooks';

/**
 * The "?" in the header: keyboard shortcuts on the spot, and the way to the full
 * guide. Also owns the two app-wide shortcuts, `?` to open it and `/` to jump to
 * the search box of whatever page is open.
 */
export function HelpMenu() {
  const t = useTranslations('help.menu');
  const [open, setOpen] = useState(false);

  useShortcut('?', () => setOpen(true));
  useShortcut('/', () =>
    document.querySelector<HTMLInputElement>('main input[type="search"]')?.focus(),
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-full"
        aria-label={t('open')}
        aria-keyshortcuts="?"
        title={`${t('open')} (?)`}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden className="text-base font-medium">
          ?
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg space-y-4 text-left">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>

          <dl className="max-h-[50vh] space-y-2 overflow-y-auto">
            {SHORTCUTS.map(({ keys, action }) => (
              <div key={action} className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-contrast/80">{t(`shortcuts.${action}`)}</dt>
                <dd>
                  <Keys keys={keys} />
                </dd>
              </div>
            ))}
          </dl>

          <Button asChild className="w-full">
            <Link href={ROUTES.help} onClick={() => setOpen(false)}>
              {t('guide')}
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
