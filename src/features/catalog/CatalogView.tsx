'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FloatingAction,
  Pagination,
  useNotify,
  type DataTableColumn,
} from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { usePagination } from '@/lib/hooks';
import { describeError, type Product } from '@/lib/api';
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

export function CatalogView() {
  const t = useTranslations('catalog');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  const { can } = useAuth();
  const filters = useCatalogFilters();
  const notify = useNotify();
  const update = useUpdateProduct();

  const [editing, setEditing] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toggling, setToggling] = useState<Product | null>(null);

  const canManage = can('catalog:manage');
  const pagination = usePagination(JSON.stringify(filters.query));
  const { data, error, isPending } = useProducts(filters.query, pagination.params);

  const products = data?.data ?? [];

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
        product.isActive ? t('toggle.deactivatedTitle') : t('toggle.activatedTitle'),
        product.isActive
          ? t('toggle.deactivatedDescription', { name: product.name })
          : t('toggle.activatedDescription', { name: product.name }),
      );
    } catch (cause) {
      notify('error', t('toggle.failed'), describeError(cause, tStates('tryAgain')));
    }
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'product',
      header: t('columns.product'),
      cell: (product) => (
        <div className="min-w-0 space-y-0.5">
          <Link
            href={ROUTES.productStock(product.id)}
            className="font-medium text-foreground hover:text-accent"
          >
            {product.name}
          </Link>
          <p className="text-xs text-accent/70">{product.brand?.name ?? t('noBrand')}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('columns.category'),
      hideBelow: 'sm',
      cell: (product) => <span className="text-contrast/70">{product.category.name}</span>,
    },
    {
      key: 'details',
      header: t('columns.details'),
      hideBelow: 'lg',
      cell: (product) => <span className="text-xs text-contrast/60">{detailsOf(product)}</span>,
    },
    {
      key: 'caseSize',
      header: t('columns.caseSize'),
      align: 'end',
      hideBelow: 'md',
      cell: (product) => (
        <span className="text-contrast/70">{format.number(product.caseSize)}</span>
      ),
    },
    {
      key: 'minimumStock',
      header: t('columns.minimum'),
      align: 'end',
      hideBelow: 'md',
      cell: (product) => (
        <span className="text-contrast/70">
          {product.minimumStock === null ? tStates('none') : format.number(product.minimumStock)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      align: 'end',
      cell: (product) =>
        product.isActive ? (
          <span className="text-xs text-contrast/40">{t('active')}</span>
        ) : (
          <Badge tone="danger">{t('deactivated')}</Badge>
        ),
    },
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      cell: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => openForm(product)}>
            {tActions('edit')}
          </Button>
          <Button
            variant={product.isActive ? 'danger-outline' : 'secondary'}
            size="sm"
            onClick={() => setToggling(product)}
          >
            {product.isActive ? t('deactivate') : t('activate')}
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-contrast/60">
            {canManage ? t('subtitleManage') : t('subtitleRead')}
          </p>
        </div>

        {canManage && (
          <Button size="lg" className="hidden sm:inline-flex" onClick={() => openForm(null)}>
            {t('new')}
          </Button>
        )}
      </header>

      {canManage && (
        <FloatingAction
          label={t('new')}
          items={[{ label: t('new'), onClick: () => openForm(null) }]}
        />
      )}

      <CatalogFilters state={filters} showStatus={canManage} />

      {error ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={products}
            rowKey={(product) => product.id}
            isLoading={isPending}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={
              <EmptyState
                title={t('empty')}
                action={
                  filters.hasAny ? (
                    <Button variant="secondary" size="sm" onClick={filters.clearAll}>
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
        title={
          toggling?.isActive
            ? t('toggle.deactivateTitle', { name: toggling.name })
            : t('toggle.activateTitle', { name: toggling?.name ?? '' })
        }
        description={
          toggling?.isActive ? t('toggle.deactivateDescription') : t('toggle.activateDescription')
        }
        cancelLabel={tActions('cancel')}
        confirmLabel={toggling?.isActive ? t('deactivate') : t('activate')}
        onConfirm={() => void toggleActive()}
        isConfirming={update.isPending}
      />
    </div>
  );
}
