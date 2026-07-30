'use client';

import Link from 'next/link';
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { formatNumber, pluralize } from '@/lib/utils';
import { useLowStock } from './api';

const SHORTLIST_SIZE = 8;

/**
 * The reorder shortlist. The API orders it by how far under the threshold each
 * product sits, so the first row is the one to buy first.
 */
export function LowStockCard({ enabled = true }: { enabled?: boolean }) {
  const { data: rows, error, isPending } = useLowStock(SHORTLIST_SIZE, enabled);

  return (
    <Card className="min-w-0 space-y-4 bg-contrast/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-accent">Below minimum</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.stock}>All stock</Link>
        </Button>
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner label="Loading the reorder list" />
        </div>
      ) : error ? (
        <EmptyState title="The reorder list could not be loaded." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing is under its reorder threshold." />
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
                  {formatNumber(row.quantityBase)} / {formatNumber(row.minimumStock ?? 0)}{' '}
                  <span className="text-xs text-contrast/50">
                    {pluralize(row.quantityBase, 'unit')}
                  </span>
                </span>
                {row.quantityBase === 0 && <Badge tone="danger">Out</Badge>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
