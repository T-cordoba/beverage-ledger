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

function QuantityStepper({
  label,
  note,
  unitLabel,
  value,
  onChange,
  canIncrease = true,
}: Readonly<{
  label: string;
  /** What a unit of this stepper is worth, when it is not one base unit. */
  note?: string;
  unitLabel: string;
  value: number;
  onChange: (delta: number) => void;
  canIncrease?: boolean;
}>) {
  const t = useTranslations('movements.picker');

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 px-3 py-2">
      <span className="min-w-0 text-xs font-light uppercase tracking-wider text-contrast/80">
        {label}
        {note && <span className="block normal-case tracking-normal text-accent/80">{note}</span>}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onChange(-1)}
          aria-label={t('remove', { unit: unitLabel })}
          className="rounded-lg text-base font-light hover:bg-accent/20 hover:text-foreground"
        >
          −
        </Button>
        <span className="w-8 text-center text-lg font-light text-accent">{value}</span>
        <Button
          size="icon-sm"
          onClick={() => onChange(1)}
          aria-label={t('add', { unit: unitLabel })}
          disabled={!canIncrease}
          className="rounded-lg text-base font-light"
        >
          +
        </Button>
      </div>
    </div>
  );
}

type StockState = 'none' | 'low' | 'ok';

const STOCK_TONE: Record<StockState, string> = {
  none: 'text-danger',
  low: 'text-warning',
  ok: 'text-foreground',
};

function stockStateOf(available: number, minimumStock: number | null): StockState {
  if (available <= 0) return 'none';
  if (minimumStock !== null && available <= minimumStock) return 'low';
  return 'ok';
}

/** Why a "+" went dead, said where the eye already is instead of in a tooltip. */
function limitMessage(
  t: ReturnType<typeof useTranslations<'movements.picker'>>,
  available: number,
  remaining: number,
  caseSize: number,
): string | null {
  if (available <= 0) return t('limit.noneAtOrigin');
  if (remaining <= 0) return t('limit.allTaken', { count: available });
  if (remaining < caseSize) return t('limit.noFullCase', { count: remaining });
  return null;
}

function ProductCard({
  product,
  quantities,
  onAdjust,
  available,
}: Readonly<{
  product: Product;
  quantities: Record<MovementUnit, number>;
  onAdjust: (unit: MovementUnit, delta: number) => void;
  /** On hand at the origin, or null when this movement does not take stock out. */
  available: number | null;
}>) {
  const t = useTranslations('movements.picker');
  const tUnits = useTranslations('common.units');
  const isSelected = quantities.BOTTLE > 0 || quantities.CASE > 0;

  // Both steppers spend the same pool, so the limit is on base units and not on
  // either counter: six bottles and one case of twelve is eighteen off the shelf.
  const taken = quantities.BOTTLE + quantities.CASE * product.caseSize;
  const remaining = available === null ? Infinity : available - taken;
  const stockState = available === null ? null : stockStateOf(available, product.minimumStock);
  const limit = available === null ? null : limitMessage(t, available, remaining, product.caseSize);

  const details = [
    { label: t('labels.category'), value: product.category.name },
    { label: t('labels.subcategory'), value: product.subcategory },
    { label: t('labels.age'), value: product.age },
    { label: t('labels.abv'), value: product.abv === null ? null : `${product.abv}%` },
    { label: t('labels.origin'), value: product.origin },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));

  return (
    <li
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border bg-surface/40 p-4 transition-colors',
        isSelected
          ? 'border-accent/50 shadow-lg shadow-accent/10'
          : 'border-border/30 hover:border-accent/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-light text-foreground transition-colors group-hover:text-accent">
            {product.name}
          </h3>
          {product.brand && <span className="text-xs text-contrast/60">{product.brand.name}</span>}
        </div>
        {stockState && stockState !== 'ok' && (
          <Badge tone={stockState === 'none' ? 'danger' : 'warning'} emphasis>
            {t(`state.${stockState}`)}
          </Badge>
        )}
      </div>

      {/* First thing under the name: how much there is decides whether the rest
          of the card matters. One sentence, "N en existencia · quedan M". */}
      {available !== null && stockState && (
        <p className="text-sm text-contrast/70">
          {t.rich('onHand', {
            count: available,
            strong: (chunks) => (
              <span className={cn('text-2xl font-semibold tabular-nums', STOCK_TONE[stockState])}>
                {chunks}
              </span>
            ),
          })}
          {taken > 0 && ` · ${t('left', { count: Math.max(remaining, 0) })}`}
        </p>
      )}

      {/* Grows to fill whatever the tallest card in the row needs, so the
          steppers below line up across the grid instead of floating mid-card. */}
      <dl className="grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-1.5 text-xs">
        {details.map((detail) => (
          <div key={detail.label} className="min-w-0">
            <dt className="uppercase tracking-wider text-contrast/50">{detail.label}</dt>
            <dd className="truncate text-contrast/90">{detail.value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <QuantityStepper
          label={tUnits('bottle', { count: 2 })}
          unitLabel={tUnits('bottle', { count: 1 })}
          value={quantities.BOTTLE}
          onChange={(delta) => onAdjust('BOTTLE', delta)}
          canIncrease={remaining >= 1}
        />
        <QuantityStepper
          label={tUnits('case', { count: 2 })}
          // On the control itself, and nowhere else now: what a case costs the
          // shelf is the number this stepper is really moving.
          note={t('unitsPerCase', { count: product.caseSize })}
          unitLabel={tUnits('case', { count: 1 })}
          value={quantities.CASE}
          onChange={(delta) => onAdjust('CASE', delta)}
          canIncrease={remaining >= product.caseSize}
        />
      </div>

      <p aria-live="polite" className="min-h-4 text-xs text-warning">
        {limit}
      </p>

      {/* Reserved whether or not anything is taken, so adding the first bottle
          does not make every card in the row grow a line. */}
      <p
        className={cn(
          'text-right text-sm font-medium',
          taken > 0 ? 'text-accent' : 'text-transparent',
        )}
      >
        {t('takenTotal', { count: taken })}
      </p>
    </li>
  );
}

export function ProductPicker({
  filters,
  draft,
}: Readonly<{
  filters: CatalogFiltersState;
  draft: MovementDraft;
}>) {
  const t = useTranslations('movements.picker');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const pagination = usePagination(JSON.stringify(filters.query));
  const { data, error, isPending, isPlaceholderData } = useProducts(
    filters.query,
    pagination.params,
  );

  // The cards carry steppers holding what has already been captured, and their
  // height depends on how many badges each product happens to have. So the page
  // being turned keeps the previous one on screen instead of being replaced by
  // ghosts that would guess wrong; the pagination going dead is what says a page
  // is on its way.
  const isTurningPage = isPlaceholderData;
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

  let listView: ReactNode;
  if (isPending) {
    listView = (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  } else if (error) {
    listView = <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />;
  } else if (products.length === 0) {
    listView = (
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
    );
  } else {
    listView = (
      <>
        {/* Three across at most: each card carries two steppers and the
            on-hand figure, and a fourth column squeezes those into nothing. */}
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
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
            isLoading={isTurningPage}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <CatalogFilters state={filters} />

      {/* Anchored on the picker and not the window: this shares the screen with
          the capture form above it, which the reader does not want to be sent
          back to for turning a page of products. */}
      <Card
        ref={pagination.anchorRef}
        className="scroll-mt-20 bg-surface/60 p-3 shadow-overlay sm:rounded-3xl sm:p-4 lg:p-8"
      >
        <div className="mb-4 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center lg:mb-8">
          <h2 className="text-xl font-light text-foreground sm:text-2xl">{t('title')}</h2>
        </div>

        {listView}
      </Card>
    </div>
  );
}
