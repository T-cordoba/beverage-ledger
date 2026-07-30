'use client';

import type { ReactNode } from 'react';
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui';
import { CatalogFilters, useProducts, type CatalogFiltersState } from '@/features/catalog';
import type { MovementUnit, Product } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';
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
  unitLabel,
  value,
  onChange,
}: {
  label: string;
  unitLabel: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 px-4 py-3 backdrop-blur-sm sm:justify-start sm:gap-4 sm:px-6 sm:py-4">
      <span className="min-w-[60px] text-xs font-light uppercase tracking-wider text-contrast/80 sm:min-w-[80px] sm:text-sm">
        {label}
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onChange(-1)}
          aria-label={`Remove ${unitLabel}`}
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
          aria-label={`Add ${unitLabel}`}
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
}: {
  product: Product;
  quantities: Record<MovementUnit, number>;
  onAdjust: (unit: MovementUnit, delta: number) => void;
}) {
  const isSelected = quantities.BOTTLE > 0 || quantities.CASE > 0;

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
              {product.caseSize} per case
            </MetaItem>
          </div>

          <Badge tone="accent" emphasis className="backdrop-blur-sm">
            {product.category.name}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 lg:min-w-[300px] lg:gap-4">
          <QuantityStepper
            label="Bottles"
            unitLabel="bottle"
            value={quantities.BOTTLE}
            onChange={(delta) => onAdjust('BOTTLE', delta)}
          />
          <QuantityStepper
            label="Cases"
            unitLabel="case"
            value={quantities.CASE}
            onChange={(delta) => onAdjust('CASE', delta)}
          />
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
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useProducts(
    filters.query,
  );

  const products = data?.pages.flatMap((page) => page.data) ?? [];
  const loadedCount = products.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <CatalogFilters state={filters} />

      <Card className="bg-surface/60 p-3 shadow-overlay sm:rounded-3xl sm:p-4 lg:p-8">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center lg:mb-8">
          <h2 className="text-xl font-light text-foreground sm:text-2xl">Select products</h2>
          {!isPending && (
            <p className="text-xs font-light text-contrast/60 sm:text-sm">
              {formatNumber(loadedCount)} loaded
              {hasNextPage && ' — more available'}
            </p>
          )}
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" label="Loading products" />
          </div>
        ) : error ? (
          <EmptyState
            title="The catalogue could not be loaded."
            description="Check that the API is reachable and try again."
          />
        ) : products.length === 0 ? (
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
        ) : (
          <>
            <ul className="grid gap-2 sm:gap-4 lg:gap-6">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  quantities={draft.quantityOf(product.id)}
                  onAdjust={(unit, delta) => draft.adjust(product, unit, delta)}
                />
              ))}
            </ul>

            {hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  isLoading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  Load more products
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
