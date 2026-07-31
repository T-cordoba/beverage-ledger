'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge, Button, Card, EmptyState, Pagination, Spinner } from '@/components/ui';
import { CatalogFilters, useProducts, type CatalogFiltersState } from '@/features/catalog';
// The module, not the barrel: stock imports a movements component, so a barrel
// import here would close the cycle.
import { useStockAvailability } from '@/features/stock/api';
import type { MovementUnit, Product } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { MOVEMENT_TYPES } from './movement-types';
import type { MovementDraft } from './useMovementDraft';

function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-contrast/70">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function QuantityStepper({
  label,
  note,
  unitLabel,
  value,
  onChange,
  canIncrease = true,
  atLimitLabel,
}: {
  label: string;
  /** What a unit of this stepper is worth, when it is not one base unit. */
  note?: string;
  unitLabel: string;
  value: number;
  onChange: (delta: number) => void;
  canIncrease?: boolean;
  atLimitLabel?: string;
}) {
  const t = useTranslations('movements.picker');

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 px-4 py-3 backdrop-blur-sm sm:justify-start sm:gap-4 sm:px-6 sm:py-4">
      <span className="min-w-[60px] text-xs font-light uppercase tracking-wider text-contrast/80 sm:min-w-[80px] sm:text-sm">
        {label}
        {note && <span className="block normal-case tracking-normal text-accent/80">{note}</span>}
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onChange(-1)}
          aria-label={t('remove', { unit: unitLabel })}
          className="rounded-lg text-base font-light hover:bg-accent/20 hover:text-foreground sm:h-10 sm:w-10 sm:text-lg"
        >
          −
        </Button>
        <span className="w-8 text-center text-lg font-light text-accent sm:w-12 sm:text-xl">
          {value}
        </span>
        <Button
          size="icon-sm"
          onClick={() => onChange(1)}
          aria-label={t('add', { unit: unitLabel })}
          disabled={!canIncrease}
          title={canIncrease ? undefined : atLimitLabel}
          className="rounded-lg text-base font-light sm:h-10 sm:w-10 sm:text-lg"
        >
          +
        </Button>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  quantities,
  onAdjust,
  available,
}: {
  product: Product;
  quantities: Record<MovementUnit, number>;
  onAdjust: (unit: MovementUnit, delta: number) => void;
  /** On hand at the origin, or null when this movement does not take stock out. */
  available: number | null;
}) {
  const t = useTranslations('movements.picker');
  const tUnits = useTranslations('common.units');
  const isSelected = quantities.BOTTLE > 0 || quantities.CASE > 0;

  // Both steppers spend the same pool, so the limit is on base units and not on
  // either counter: six bottles and one case of twelve is eighteen off the shelf.
  const taken = quantities.BOTTLE + quantities.CASE * product.caseSize;
  const remaining = available === null ? Infinity : available - taken;
  const atLimitLabel = t('atLimit', { count: Math.max(remaining, 0) });

  return (
    <li
      className={cn(
        'group relative rounded-xl border bg-gradient-to-r from-background/80 to-surface/80 p-3 backdrop-blur-sm transition-colors sm:rounded-2xl sm:p-4 lg:p-8',
        isSelected
          ? 'border-accent/50 shadow-lg shadow-accent/10'
          : 'border-border/30 hover:border-accent/30',
      )}
    >
      {isSelected && (
        <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent sm:right-4 sm:top-4 sm:h-3 sm:w-3" />
      )}

      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-light text-foreground transition-colors group-hover:text-accent sm:text-xl lg:text-2xl">
            {product.name}
          </h3>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {product.brand && <Badge>{product.brand.name}</Badge>}
            {product.subcategory && <Badge tone="accent">{product.subcategory}</Badge>}
            {product.age && <Badge tone="info">{product.age}</Badge>}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            {product.abv !== null && (
              <MetaItem
                icon={
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                }
              >
                {product.abv}% ABV
              </MetaItem>
            )}
            {product.origin && (
              <MetaItem
                icon={
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                }
              >
                {product.origin}
              </MetaItem>
            )}
            <MetaItem
              icon={
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              }
            >
              {t('perCase', { count: product.caseSize })}
            </MetaItem>
          </div>

          <Badge tone="accent" emphasis className="backdrop-blur-sm">
            {product.category.name}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 lg:min-w-[300px] lg:gap-4">
          {available !== null && (
            <p
              className={cn(
                'text-right text-xs',
                remaining <= 0 ? 'text-warning' : 'text-contrast/60',
              )}
            >
              {t('onHand', { count: available })}
              {taken > 0 && ` · ${t('left', { count: Math.max(remaining, 0) })}`}
            </p>
          )}

          <QuantityStepper
            label={tUnits('bottle', { count: 2 })}
            unitLabel={tUnits('bottle', { count: 1 })}
            value={quantities.BOTTLE}
            onChange={(delta) => onAdjust('BOTTLE', delta)}
            canIncrease={remaining >= 1}
            atLimitLabel={atLimitLabel}
          />
          <QuantityStepper
            label={tUnits('case', { count: 2 })}
            // On the control itself, not only in the product's meta row: what a
            // case costs the shelf is the number this stepper is really moving.
            note={t('unitsPerCase', { count: product.caseSize })}
            unitLabel={tUnits('case', { count: 1 })}
            value={quantities.CASE}
            onChange={(delta) => onAdjust('CASE', delta)}
            canIncrease={remaining >= product.caseSize}
            atLimitLabel={atLimitLabel}
          />

          {taken > 0 && (
            <p className="text-right text-sm font-medium text-accent">
              {t('takenTotal', { count: taken })}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function ProductPicker({
  filters,
  draft,
}: {
  filters: CatalogFiltersState;
  draft: MovementDraft;
}) {
  const t = useTranslations('movements.picker');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const pagination = usePagination(JSON.stringify(filters.query));
  const { data, error, isPending } = useProducts(filters.query, pagination);

  const products = data?.data ?? [];

  // Only for the products on screen, and only when the movement takes stock out:
  // an inbound has no ceiling, and an adjustment is what corrects the number this
  // would be capping by.
  const capped = MOVEMENT_TYPES[draft.type].takesFromOrigin;
  const { levels, isReady } = useStockAvailability(
    products.map((product) => product.id),
    draft.locationId || undefined,
    capped,
  );

  // Until the levels arrive there is no ceiling to enforce, which leaves the
  // steppers as they were rather than blocking them on a pending request.
  const availableOf = (productId: string): number | null =>
    isReady ? (levels.get(productId) ?? 0) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <CatalogFilters state={filters} />

      <Card className="bg-surface/60 p-3 shadow-overlay sm:rounded-3xl sm:p-4 lg:p-8">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center lg:mb-8">
          <h2 className="text-xl font-light text-foreground sm:text-2xl">{t('title')}</h2>
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" label={t('loading')} />
          </div>
        ) : error ? (
          <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
        ) : products.length === 0 ? (
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
        ) : (
          <>
            <ul className="grid gap-2 sm:gap-4 lg:gap-6">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  quantities={draft.quantityOf(product.id)}
                  onAdjust={(unit, delta) => draft.adjust(product, unit, delta)}
                  available={availableOf(product.id)}
                />
              ))}
            </ul>

            {data && (
              <Pagination
                className="mt-6"
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={data.meta.total}
                pageCount={data.meta.pageCount}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
