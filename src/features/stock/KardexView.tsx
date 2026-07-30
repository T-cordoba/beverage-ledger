'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Spinner,
  StatTile,
  type DataTableColumn,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useProduct } from '@/features/catalog';
import { MovementTypeBadge } from '@/features/movements';
import type { KardexEntry } from '@/lib/api';
import { formatDateTime, formatNumber, formatSignedNumber, pluralize } from '@/lib/utils';
import { useKardex } from './api';
import { describeCases } from './quantity';

const columns: DataTableColumn<KardexEntry>[] = [
  {
    key: 'occurredAt',
    header: 'Occurred at',
    cell: (entry) => <span className="text-contrast/70">{formatDateTime(entry.occurredAt)}</span>,
  },
  {
    key: 'movement',
    header: 'Movement',
    cell: (entry) => (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={ROUTES.movement(entry.movementId)}
          className="font-mono text-sm text-accent hover:underline"
        >
          {entry.movementCode}
        </Link>
        <MovementTypeBadge type={entry.type} />
      </div>
    ),
  },
  {
    key: 'captured',
    header: 'Captured',
    align: 'end',
    hideBelow: 'sm',
    cell: (entry) => (
      <span className="text-contrast/70">
        {formatNumber(entry.quantity)} {pluralize(entry.quantity, entry.unit.toLowerCase())}
      </span>
    ),
  },
  {
    key: 'change',
    header: 'Change',
    align: 'end',
    cell: (entry) => (
      <span className="font-medium text-foreground">{formatSignedNumber(entry.quantityBase)}</span>
    ),
  },
  {
    key: 'balance',
    header: 'Balance',
    align: 'end',
    cell: (entry) => (
      <span className="font-medium text-accent">{formatNumber(entry.balanceAfter)}</span>
    ),
  },
];

export function KardexView({ productId }: { productId: string }) {
  const product = useProduct(productId);
  const kardex = useKardex(productId);

  if (product.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" label="Loading the product" />
      </div>
    );
  }

  if (product.error || !product.data) {
    return (
      <EmptyState
        title="That product is not available."
        description="It may have been removed, or it belongs to another organization."
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href={ROUTES.stock}>Back to stock</Link>
          </Button>
        }
      />
    );
  }

  const entries = kardex.data?.pages.flatMap((page) => page.data) ?? [];

  // The kardex comes newest first with the balance each line left behind, so the
  // first entry carries what is on hand right now. No second request for it.
  const onHand = entries[0]?.balanceAfter ?? 0;
  const cases = describeCases(onHand, product.data.caseSize);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={ROUTES.stock} className="text-sm text-contrast/60 hover:text-accent">
          ← Stock on hand
        </Link>
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{product.data.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {product.data.brand && <Badge>{product.data.brand.name}</Badge>}
          <Badge tone="accent">{product.data.category.name}</Badge>
          {!product.data.isActive && <Badge tone="danger">Inactive</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="On hand"
          value={formatNumber(onHand)}
          hint={cases ?? `${product.data.caseSize} per case`}
        />
        <StatTile
          label="Minimum"
          value={product.data.minimumStock === null ? '—' : formatNumber(product.data.minimumStock)}
          tone={
            product.data.minimumStock !== null && onHand <= product.data.minimumStock
              ? 'warning'
              : 'accent'
          }
        />
        <StatTile label="Case size" value={formatNumber(product.data.caseSize)} />
        <StatTile
          label="Lines loaded"
          value={formatNumber(entries.length)}
          hint={kardex.hasNextPage ? 'more available' : undefined}
        />
      </div>

      {kardex.error ? (
        <EmptyState
          title="The kardex could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <h2 className="border-b border-border/40 p-4 text-lg font-light text-foreground sm:p-6">
            Ledger lines
          </h2>
          <DataTable
            caption={`Confirmed ledger lines for ${product.data.name}`}
            columns={columns}
            rows={entries}
            rowKey={(entry) => entry.id}
            isLoading={kardex.isPending}
            loadingLabel="Loading the kardex"
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={
              <EmptyState
                title="This product has never moved."
                description="Its stock stays at zero until a movement is confirmed."
              />
            }
          />
        </Card>
      )}

      {kardex.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="lg"
            isLoading={kardex.isFetchingNextPage}
            onClick={() => void kardex.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
