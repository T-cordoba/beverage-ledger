'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Pagination,
  RefreshButton,
  Select,
  Skeleton,
  type DataTableColumn,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useCategories } from '@/features/catalog';
import { LocationSelect } from '@/features/locations';
import type { StockLevel } from '@/lib/api';
import { rowsOnPage, useDebouncedValue, usePagination } from '@/lib/hooks';
import { useStockLevels, type StockQuery } from './api';
import { useDescribeCases } from './quantity';

export function StockLevelsView() {
  const t = useTranslations('stock.levels');
  const tUnits = useTranslations('common.units');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();
  const describeCases = useDescribeCases();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const { data: categories = [] } = useCategories();

  const query = useMemo<StockQuery>(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(locationId ? { locationId } : {}),
    }),
    [categoryId, debouncedSearch, locationId],
  );

  const pagination = usePagination(JSON.stringify(query));
  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useStockLevels(
    query,
    pagination.params,
  );

  // The query keeps the previous page on screen while the next one loads, which
  // is why `isPending` alone is not the answer: turning a page has data the
  // whole time, only from the page before it.
  const isLoading = isPending || isPlaceholderData;
  const rows = data?.data ?? [];
  const hasFilters = Boolean(search || categoryId || locationId);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setLocationId('');
  };

  const columns: DataTableColumn<StockLevel>[] = [
    {
      key: 'product',
      header: t('columns.product'),
      // Two lines, like the cell it stands in for: name over brand.
      skeleton: (
        <div className="space-y-0.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      ),
      cell: (row) => (
        <div className="min-w-0 space-y-0.5">
          <Link
            href={ROUTES.productStock(row.productId)}
            className="font-medium text-foreground hover:text-accent"
          >
            {row.productName}
          </Link>
          {row.brandName && <p className="text-xs text-accent/70">{row.brandName}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: t('columns.category'),
      hideBelow: 'md',
      cell: (row) => <span className="text-contrast/70">{row.categoryName}</span>,
    },
    {
      key: 'onHand',
      header: t('columns.onHand'),
      align: 'end',
      skeleton: (
        <div className="space-y-0.5">
          <Skeleton className="ml-auto h-5 w-20" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ),
      cell: (row) => {
        const cases = describeCases(row.quantityBase, row.caseSize);

        return (
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">
              {format.number(row.quantityBase)}{' '}
              <span className="text-xs font-normal text-contrast/50">
                {tUnits('unit', { count: row.quantityBase })}
              </span>
            </p>
            {cases && <p className="text-xs text-contrast/50">{cases}</p>}
          </div>
        );
      },
    },
    {
      key: 'minimum',
      header: t('columns.minimum'),
      align: 'end',
      hideBelow: 'sm',
      skeleton: <Skeleton className="ml-auto h-5 w-10" />,
      cell: (row) => (
        <span className="text-contrast/70">
          {row.minimumStock === null ? tStates('none') : format.number(row.minimumStock)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      align: 'end',
      skeleton: <Skeleton className="ml-auto h-6 w-16" />,
      cell: (row) =>
        row.isBelowMinimum ? (
          <Badge tone="warning">{t('belowMinimum')}</Badge>
        ) : (
          <span className="text-xs text-contrast/40">{t('ok')}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>
        <RefreshButton onRefresh={() => void refetch()} isRefreshing={isFetching} />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={t('searchLabel')}
        />
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          aria-label={t('filterCategory')}
          options={[
            { value: '', label: t('allCategories') },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
        />
        {/* One location at a time, never a sum: stock is per location, and adding
            two warehouses together is a number nobody can act on. */}
        <LocationSelect
          value={locationId}
          onValueChange={setLocationId}
          aria-label={t('filterLocation')}
        />
      </div>

      {error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={rows}
            rowKey={(row) => row.productId}
            isLoading={isLoading}
            skeletonRows={rowsOnPage(pagination.page, pagination.pageSize, data?.meta.total)}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={
              <EmptyState
                title={hasFilters ? t('emptyFiltered') : t('empty')}
                action={
                  hasFilters ? (
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      {tActions('clearFilters')}
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </Card>
      )}

      {data && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={data.meta.total}
          pageCount={data.meta.pageCount}
          isLoading={isLoading}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </div>
  );
}
