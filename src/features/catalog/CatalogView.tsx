'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  useNotify,
  type DataTableColumn,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { describeError, type Product } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { useProducts, useUpdateProduct } from './api';
import { CatalogFilters } from './CatalogFilters';
import { ProductFormDialog } from './ProductFormDialog';
import { useCatalogFilters } from './useCatalogFilters';

function detailsOf(product: Product): string {
  return [
    product.subcategory,
    product.origin,
    product.age,
    product.abv === null ? null : `${product.abv}%`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function columnsOf(
  canManage: boolean,
  onEdit: (product: Product) => void,
  onToggle: (product: Product) => void,
) {
  const columns: DataTableColumn<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (product) => (
        <div className="min-w-0 space-y-0.5">
          <Link
            href={ROUTES.productStock(product.id)}
            className="font-medium text-foreground hover:text-accent"
          >
            {product.name}
          </Link>
          <p className="text-xs text-accent/70">{product.brand?.name ?? 'No brand'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideBelow: 'sm',
      cell: (product) => <span className="text-contrast/70">{product.category.name}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      hideBelow: 'lg',
      cell: (product) => <span className="text-xs text-contrast/60">{detailsOf(product)}</span>,
    },
    {
      key: 'caseSize',
      header: 'Per case',
      align: 'end',
      hideBelow: 'md',
      cell: (product) => <span className="text-contrast/70">{formatNumber(product.caseSize)}</span>,
    },
    {
      key: 'minimumStock',
      header: 'Minimum',
      align: 'end',
      hideBelow: 'md',
      cell: (product) => (
        <span className="text-contrast/70">
          {product.minimumStock === null ? '—' : formatNumber(product.minimumStock)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'end',
      cell: (product) =>
        product.isActive ? (
          <span className="text-xs text-contrast/40">Active</span>
        ) : (
          <Badge tone="danger">Deactivated</Badge>
        ),
    },
  ];

  if (!canManage) return columns;

  return [
    ...columns,
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      cell: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(product)}>
            Edit
          </Button>
          <Button
            variant={product.isActive ? 'danger-outline' : 'secondary'}
            size="sm"
            onClick={() => onToggle(product)}
          >
            {product.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    } satisfies DataTableColumn<Product>,
  ];
}

export function CatalogView() {
  const { can } = useAuth();
  const filters = useCatalogFilters();
  const notify = useNotify();
  const update = useUpdateProduct();

  const [editing, setEditing] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toggling, setToggling] = useState<Product | null>(null);

  const canManage = can('catalog:manage');
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useProducts(
    filters.query,
  );

  const products = data?.pages.flatMap((page) => page.data) ?? [];

  const openForm = (product: Product | null) => {
    setEditing(product);
    setIsFormOpen(true);
  };

  const toggleActive = async () => {
    if (!toggling) return;

    const product = toggling;
    setToggling(null);

    try {
      await update.mutateAsync({ id: product.id, input: { isActive: !product.isActive } });
      notify(
        'success',
        product.isActive ? 'Product deactivated' : 'Product activated',
        product.isActive
          ? `${product.name} stops showing up when registering movements.`
          : `${product.name} is available again.`,
      );
    } catch (cause) {
      notify('error', 'Could not change the product', describeError(cause, 'Please try again.'));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">Catalogue</h1>
          <p className="text-sm text-contrast/60">
            {canManage
              ? 'What can be moved, and the case size every quantity is normalized with.'
              : 'What can be moved. Editing it needs the catalogue permission.'}
          </p>
        </div>

        {canManage && (
          <Button size="lg" onClick={() => openForm(null)}>
            New product
          </Button>
        )}
      </header>

      <CatalogFilters state={filters} showStatus={canManage} />

      {error ? (
        <EmptyState
          title="The catalogue could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption="Products in the catalogue"
            columns={columnsOf(canManage, openForm, setToggling)}
            rows={products}
            rowKey={(product) => product.id}
            isLoading={isPending}
            loadingLabel="Loading the catalogue"
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={
              <EmptyState
                title="No products match those filters."
                action={
                  filters.hasAny ? (
                    <Button variant="secondary" size="sm" onClick={filters.clearAll}>
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

      {canManage && (
        // Keyed so the form seeds itself from whichever product is being edited.
        <ProductFormDialog
          key={editing?.id ?? 'new'}
          product={editing}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />
      )}

      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
        tone={toggling?.isActive ? 'danger' : 'accent'}
        title={toggling?.isActive ? `Deactivate ${toggling.name}?` : `Activate ${toggling?.name}?`}
        description={
          toggling?.isActive
            ? 'It stays in the ledger and in every past movement, but stops being offered for new ones.'
            : 'It becomes available for new movements again.'
        }
        cancelLabel="Keep it"
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={() => void toggleActive()}
        isConfirming={update.isPending}
      />
    </div>
  );
}
