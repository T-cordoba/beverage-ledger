'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useShortcut } from '@/lib/hooks';

/** Shortcuts this app defines, then the ones the browser and the controls give for free. */
const SHORTCUTS = [
  { keys: ['/'], action: 'search' },
  { keys: ['?'], action: 'help' },
  { keys: ['Ctrl', 'Z'], action: 'undo' },
  { keys: ['Ctrl', 'Y'], action: 'redo' },
  { keys: ['Ctrl', 'Enter'], action: 'register' },
  { keys: ['Enter'], action: 'submit' },
  { keys: ['Esc'], action: 'close' },
  { keys: ['A–Z'], action: 'jump' },
  { keys: ['↑', '↓'], action: 'navigate' },
  { keys: ['Tab'], action: 'focus' },
] as const;

function Keys({ keys }: Readonly<{ keys: readonly string[] }>) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="min-w-7 rounded-md border border-border bg-background px-1.5 py-0.5 text-center font-mono text-xs text-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

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
