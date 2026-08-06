'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Pagination,
  RefreshButton,
  Skeleton,
  Spinner,
  StatTile,
  type DataTableColumn,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useProduct } from '@/features/catalog';
import { MovementTypeBadge } from '@/features/movements';
import type { KardexEntry } from '@/lib/api';
import { rowsOnPage, usePagination } from '@/lib/hooks';
import { useKardex, useStockAvailability } from './api';
import { stockKeys } from './keys';
import { useDescribeCases } from './quantity';

export function KardexView({ productId }: { productId: string }) {
  const t = useTranslations('stock.kardex');
  const tUnits = useTranslations('common.units');
  const tStates = useTranslations('common.states');
  const format = useFormatter();
  const describeCases = useDescribeCases();

  const product = useProduct(productId);
  const pagination = usePagination(productId);
  const kardex = useKardex(productId, undefined, pagination.params);
  // Turning a page keeps the previous one on screen, so this and not `isPending`.
  const isLoadingPage = kardex.isPending || kardex.isPlaceholderData;
  const availability = useStockAvailability([productId]);

  // The whole stock branch, not just the ledger page: the tiles above the table
  // read the on-hand figure from a separate query, and a refresh that moved one
  // without the other would put a balance and a total side by side that no
  // moment in time ever agreed on.
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: stockKeys.all });

  const columns: DataTableColumn<KardexEntry>[] = [
    {
      key: 'occurredAt',
      header: t('columns.occurredAt'),
      // Only from `sm` up: in the detail panel the date has a line of its own
      // and wrapping is what keeps it from running off the edge.
      className: 'sm:whitespace-nowrap',
      cell: (entry) => (
        <span className="text-contrast/70">
          {format.dateTime(new Date(entry.occurredAt), 'full')}
        </span>
      ),
    },
    {
      key: 'movement',
      header: t('columns.movement'),
      primary: true,
      // A badge sits in this cell, and it is what sets the row's height.
      skeleton: <Skeleton className="h-6 w-32" />,
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
      skeleton: <Skeleton className="ml-auto h-5 w-20" />,
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
      summary: true,
      skeleton: <Skeleton className="ml-auto h-5 w-12" />,
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
      skeleton: <Skeleton className="ml-auto h-5 w-12" />,
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

  const entries = kardex.data?.data ?? [];

  // Read from the stock endpoint rather than off the first line's running
  // balance: that shortcut only held while the list could not be paged, and on
  // page two it would report the balance as of some day last month.
  const onHand = availability.levels.get(productId) ?? 0;
  const cases = describeCases(onHand, product.data.caseSize);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={ROUTES.stock} className="text-sm text-contrast/60 hover:text-accent">
          ← {t('backToStock')}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{product.data.name}</h1>
          <RefreshButton onRefresh={refresh} isRefreshing={kardex.isFetching} />
        </div>
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
        <StatTile label={t('lines')} value={format.number(kardex.data?.meta.total ?? 0)} />
      </div>

      {kardex.error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <h2 className="border-b border-border/40 p-4 text-lg font-light text-foreground sm:p-6">
            {t('title')}
          </h2>
          <DataTable
            caption={t('caption', { product: product.data.name })}
            columns={columns}
            rows={entries}
            rowKey={(entry) => entry.id}
            isLoading={isLoadingPage}
            skeletonRows={rowsOnPage(pagination.page, pagination.pageSize, kardex.data?.meta.total)}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={t('empty')} description={t('emptyDescription')} />}
          />
        </Card>
      )}

      {kardex.data && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={kardex.data.meta.total}
          pageCount={kardex.data.meta.pageCount}
          isLoading={isLoadingPage}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </div>
  );
}
