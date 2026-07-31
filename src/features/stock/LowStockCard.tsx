'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useLowStock } from './api';

const SHORTLIST_SIZE = 8;

/**
 * The reorder shortlist. The API orders it by how far under the threshold each
 * product sits, so the first row is the one to buy first.
 */
export function LowStockCard({ enabled = true }: { enabled?: boolean }) {
  const t = useTranslations('stock.low');
  const tUnits = useTranslations('common.units');
  const format = useFormatter();
  const { data: rows, error, isPending } = useLowStock(SHORTLIST_SIZE, enabled);

  return (
    <Card className="min-w-0 space-y-4 bg-contrast/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-accent">{t('title')}</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.stock}>{t('all')}</Link>
        </Button>
      </div>

      {isPending ? (
        <ul role="status" aria-label={t('loading')} className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="rounded-lg bg-contrast/5 p-3">
              <Skeleton className="h-10" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <EmptyState title={t('loadFailed')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.productId}
              className="flex items-center justify-between gap-3 rounded-lg bg-contrast/5 p-3"
            >
              <div className="min-w-0">
                <Link
                  href={ROUTES.productStock(row.productId)}
                  className="block truncate text-sm font-medium text-foreground hover:text-accent"
                >
                  {row.productName}
                </Link>
                <p className="truncate text-xs text-contrast/50">{row.categoryName}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-contrast/70">
                  {format.number(row.quantityBase)} / {format.number(row.minimumStock ?? 0)}{' '}
                  <span className="text-xs text-contrast/50">
                    {tUnits('unit', { count: row.quantityBase })}
                  </span>
                </span>
                {row.quantityBase === 0 && <Badge tone="danger">{t('out')}</Badge>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
