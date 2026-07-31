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
  Select,
  type DataTableColumn,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useCategories } from '@/features/catalog';
import { LocationSelect } from '@/features/locations';
import type { StockLevel } from '@/lib/api';
import { useDebouncedValue, usePagination } from '@/lib/hooks';
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
  const { data, error, isPending } = useStockLevels(query, pagination.params);

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
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-contrast/60">{t('subtitle')}</p>
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
        <Card className="p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={rows}
            rowKey={(row) => row.productId}
            isLoading={isPending}
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
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </div>
  );
}
