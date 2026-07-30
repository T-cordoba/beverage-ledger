'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Select,
  type DataTableColumn,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useCategories } from '@/features/catalog';
import type { StockLevel } from '@/lib/api';
import { useDebouncedValue } from '@/lib/hooks';
import { formatNumber, pluralize } from '@/lib/utils';
import { useStockLevels, type StockQuery } from './api';
import { describeCases } from './quantity';

const columns: DataTableColumn<StockLevel>[] = [
  {
    key: 'product',
    header: 'Product',
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
    header: 'Category',
    hideBelow: 'md',
    cell: (row) => <span className="text-contrast/70">{row.categoryName}</span>,
  },
  {
    key: 'onHand',
    header: 'On hand',
    align: 'end',
    cell: (row) => {
      const cases = describeCases(row.quantityBase, row.caseSize);

      return (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">
            {formatNumber(row.quantityBase)}{' '}
            <span className="text-xs font-normal text-contrast/50">
              {pluralize(row.quantityBase, 'unit')}
            </span>
          </p>
          {cases && <p className="text-xs text-contrast/50">{cases}</p>}
        </div>
      );
    },
  },
  {
    key: 'minimum',
    header: 'Minimum',
    align: 'end',
    hideBelow: 'sm',
    cell: (row) => (
      <span className="text-contrast/70">
        {row.minimumStock === null ? '—' : formatNumber(row.minimumStock)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'end',
    cell: (row) =>
      row.isBelowMinimum ? (
        <Badge tone="warning">Below minimum</Badge>
      ) : (
        <span className="text-xs text-contrast/40">OK</span>
      ),
  },
];

export function StockLevelsView() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const { data: categories = [] } = useCategories();

  const query = useMemo<StockQuery>(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(categoryId ? { categoryId } : {}),
    }),
    [categoryId, debouncedSearch],
  );

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useStockLevels(query);

  const rows = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Boolean(search || categoryId);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">Stock on hand</h1>
        <p className="text-sm text-contrast/60">
          What the ledger says is in the cellar right now. A product that has never moved sits at
          zero.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="search"
          placeholder="Search by product..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search stock by product"
        />
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          aria-label="Filter by category"
          options={[
            { value: '', label: 'All categories' },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
        />
      </div>

      {error ? (
        <EmptyState
          title="Stock could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption="Stock on hand by product"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.productId}
            isLoading={isPending}
            loadingLabel="Loading stock"
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={
              <EmptyState
                title={hasFilters ? 'No products match those filters.' : 'The catalogue is empty.'}
                action={
                  hasFilters ? (
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </Card>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="lg"
            isLoading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
