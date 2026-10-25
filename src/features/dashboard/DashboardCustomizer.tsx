'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';
import type { DashboardWidget } from '@/config/dashboard';
import { useDashboardLayout } from './useDashboardLayout';

/**
 * Show, hide and reorder the dashboard cards. Arrow buttons rather than drag and
 * drop: they work from a keyboard and a screen reader, and on a phone they do
 * not fight the page's own scroll.
 */
export function DashboardCustomizer({
  available,
}: Readonly<{ available: readonly DashboardWidget[] }>) {
  const t = useTranslations('dashboard.customize');
  const [open, setOpen] = useState(false);
  const layout = useDashboardLayout();
  const widgets = layout.order.filter((id) => available.includes(id));

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t('open')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md space-y-4 text-left">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>

          <ul className="space-y-2">
            {widgets.map((id, index) => {
              const label = t(`widgets.${id}`);
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-3 py-2"
                >
                  <label className="flex min-w-0 cursor-pointer items-center gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={!layout.hidden.has(id)}
                      onChange={() => layout.toggle(id)}
                      className="h-4 w-4 shrink-0 accent-accent"
                    />
                    <span className="truncate">{label}</span>
                  </label>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('moveUp', { widget: label })}
                      disabled={index === 0}
                      onClick={() => layout.move(id, -1, available)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('moveDown', { widget: label })}
                      disabled={index === widgets.length - 1}
                      onClick={() => layout.move(id, 1, available)}
                    >
                      ↓
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={layout.reset}>
              {t('reset')}
            </Button>
            <Button onClick={() => setOpen(false)}>{t('done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
