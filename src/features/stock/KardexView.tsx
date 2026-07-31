'use client';

import { useFormatter, useTranslations } from 'next-intl';
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
import { useKardex } from './api';
import { useDescribeCases } from './quantity';

export function KardexView({ productId }: { productId: string }) {
  const t = useTranslations('stock.kardex');
  const tUnits = useTranslations('common.units');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();
  const describeCases = useDescribeCases();

  const product = useProduct(productId);
  const kardex = useKardex(productId);

  const columns: DataTableColumn<KardexEntry>[] = [
    {
      key: 'occurredAt',
      header: t('columns.occurredAt'),
      className: 'whitespace-nowrap',
      cell: (entry) => (
        <span className="text-contrast/70">
          {format.dateTime(new Date(entry.occurredAt), 'full')}
        </span>
      ),
    },
    {
      key: 'movement',
      header: t('columns.movement'),
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
      header: t('columns.captured'),
      align: 'end',
      hideBelow: 'sm',
      cell: (entry) => (
        <span className="text-contrast/70">
          {format.number(entry.quantity)}{' '}
          {tUnits(entry.unit === 'CASE' ? 'case' : 'bottle', { count: entry.quantity })}
        </span>
      ),
    },
    {
      key: 'change',
      header: t('columns.change'),
      align: 'end',
      cell: (entry) => (
        <span className="font-medium text-foreground">
          {format.number(entry.quantityBase, 'signed')}
        </span>
      ),
    },
    {
      key: 'balance',
      header: t('columns.balance'),
      align: 'end',
      cell: (entry) => (
        <span className="font-medium text-accent">{format.number(entry.balanceAfter)}</span>
      ),
    },
  ];

  if (product.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" label={t('loadingProduct')} />
      </div>
    );
  }

  if (product.error || !product.data) {
    return (
      <EmptyState
        title={t('notFound')}
        description={t('notFoundDescription')}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href={ROUTES.stock}>{t('backToStock')}</Link>
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
          ← {t('backToStock')}
        </Link>
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{product.data.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {product.data.brand && <Badge>{product.data.brand.name}</Badge>}
          <Badge tone="accent">{product.data.category.name}</Badge>
          {!product.data.isActive && <Badge tone="danger">{t('inactive')}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t('onHand')}
          value={format.number(onHand)}
          hint={cases ?? t('perCase', { count: product.data.caseSize })}
        />
        <StatTile
          label={t('minimum')}
          value={
            product.data.minimumStock === null
              ? tStates('none')
              : format.number(product.data.minimumStock)
          }
          tone={
            product.data.minimumStock !== null && onHand <= product.data.minimumStock
              ? 'warning'
              : 'accent'
          }
        />
        <StatTile label={t('caseSize')} value={format.number(product.data.caseSize)} />
        <StatTile
          label={t('linesLoaded')}
          value={format.number(entries.length)}
          hint={kardex.hasNextPage ? t('moreAvailable') : undefined}
        />
      </div>

      {kardex.error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card className="p-0 sm:p-0">
          <h2 className="border-b border-border/40 p-4 text-lg font-light text-foreground sm:p-6">
            {t('title')}
          </h2>
          <DataTable
            caption={t('caption', { product: product.data.name })}
            columns={columns}
            rows={entries}
            rowKey={(entry) => entry.id}
            isLoading={kardex.isPending}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={t('empty')} description={t('emptyDescription')} />}
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
            {tActions('loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
