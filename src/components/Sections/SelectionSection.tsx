import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Licor } from '@/app/actions-licores';
import {
  AdvancedFilters,
  EMPTY_ADVANCED_FILTERS,
  type AdvancedFilterKey,
  type AdvancedFilterOptions,
  type AdvancedFilterValues,
} from '@/components/Filters';
import { Badge, Button, Card, EmptyState, Input, Select, Spinner } from '@/components/ui';
import { cn, pluralize } from '@/lib/utils';

interface SelectionSectionProps {
  licores: Licor[];
  loadingLicores: boolean;
  cantidades: Record<string, { botellas: number; cajas: number }>;
  searchTerm: string;
  typeFilter: string;
  submitting: boolean;
  onQuantityChange: (id: string, type: 'botellas' | 'cajas', delta: number) => void;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (type: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 15, 25, 50];

function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function ClearFiltersButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button
      variant="danger-outline"
      size="lg"
      onClick={onClick}
      className={cn('group sm:rounded-2xl', className)}
      aria-label="Clear all filters"
    >
      <svg
        className="h-4 w-4 transition-transform group-hover:scale-110 sm:h-5 sm:w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      Clear filters
    </Button>
  );
}

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
  value,
  onDecrement,
  onIncrement,
  unitLabel,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  unitLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 px-4 py-3 backdrop-blur-sm sm:justify-start sm:gap-4 sm:rounded-2xl sm:px-6 sm:py-4">
      <span className="min-w-[60px] text-xs font-light uppercase tracking-wider text-contrast/80 sm:min-w-[80px] sm:text-sm">
        {label}
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={onDecrement}
          aria-label={`Remove ${unitLabel}`}
          className="rounded-lg text-base font-light hover:bg-accent/20 hover:text-foreground sm:h-10 sm:w-10 sm:rounded-xl sm:text-lg"
        >
          −
        </Button>
        <span className="w-8 text-center text-lg font-light text-accent sm:w-12 sm:text-xl">
          {value}
        </span>
        <Button
          size="icon-sm"
          onClick={onIncrement}
          aria-label={`Add ${unitLabel}`}
          className="rounded-lg text-base font-light sm:h-10 sm:w-10 sm:rounded-xl sm:text-lg"
        >
          +
        </Button>
      </div>
    </div>
  );
}

export default function SelectionSection({
  licores,
  loadingLicores,
  cantidades,
  searchTerm,
  typeFilter,
  submitting,
  onQuantityChange,
  onSearchChange,
  onTypeFilterChange,
  onConfirm,
  onCancel,
}: SelectionSectionProps) {
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] =
    useState<AdvancedFilterValues>(EMPTY_ADVANCED_FILTERS);

  const [lastAddedLicorId, setLastAddedLicorId] = useState<string | null>(null);
  const licorRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const [animationKey, setAnimationKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const uniqueTypes = uniqueSorted(licores.map((licor) => licor.type));

  const advancedOptions: AdvancedFilterOptions = {
    brand: uniqueSorted(licores.map((licor) => licor.brand)),
    origin: uniqueSorted(licores.map((licor) => licor.origin)),
    subcategory: uniqueSorted(licores.map((licor) => licor.subcategory)),
    age: uniqueSorted(licores.map((licor) => licor.age)),
    abv: uniqueSorted(licores.map((licor) => licor.abv?.toString())).sort(
      (a, b) => parseFloat(a) - parseFloat(b),
    ),
  };

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
    setCurrentPage(1);
  }, [searchTerm, typeFilter, advancedFilters]);

  const licoresFiltrados = licores.filter((licor) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      licor.name.toLowerCase().includes(searchLower) ||
      licor.type.toLowerCase().includes(searchLower) ||
      (licor.brand && licor.brand.toLowerCase().includes(searchLower)) ||
      (licor.subcategory && licor.subcategory.toLowerCase().includes(searchLower)) ||
      (licor.origin && licor.origin.toLowerCase().includes(searchLower)) ||
      (licor.age && licor.age.toLowerCase().includes(searchLower));

    const matchesType = typeFilter === '' || licor.type === typeFilter;
    const matchesAdvanced =
      (advancedFilters.brand === '' || licor.brand === advancedFilters.brand) &&
      (advancedFilters.origin === '' || licor.origin === advancedFilters.origin) &&
      (advancedFilters.subcategory === '' || licor.subcategory === advancedFilters.subcategory) &&
      (advancedFilters.age === '' || licor.age === advancedFilters.age) &&
      (advancedFilters.abv === '' || licor.abv?.toString() === advancedFilters.abv);

    return matchesSearch && matchesType && matchesAdvanced;
  });

  const licoresOrdenados = [...licoresFiltrados].sort((a, b) => {
    const cantidadA = cantidades[a.id] || { botellas: 0, cajas: 0 };
    const cantidadB = cantidades[b.id] || { botellas: 0, cajas: 0 };

    const tieneSeleccionA = cantidadA.botellas > 0 || cantidadA.cajas > 0;
    const tieneSeleccionB = cantidadB.botellas > 0 || cantidadB.cajas > 0;

    if (tieneSeleccionA && !tieneSeleccionB) return -1;
    if (!tieneSeleccionA && tieneSeleccionB) return 1;

    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.ceil(licoresOrdenados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPageLicores = licoresOrdenados.slice(startIndex, startIndex + itemsPerPage);

  const handleQuantityChange = (id: string, type: 'botellas' | 'cajas', delta: number) => {
    const currentCantidad = cantidades[id] || { botellas: 0, cajas: 0 };

    if (delta > 0 && currentCantidad[type] === 0) {
      setLastAddedLicorId(id);
    }

    onQuantityChange(id, type, delta);
  };

  useEffect(() => {
    if (!lastAddedLicorId) return;

    const licorIndex = licoresOrdenados.findIndex((licor) => licor.id === lastAddedLicorId);
    if (licorIndex !== -1) {
      const targetPage = Math.floor(licorIndex / itemsPerPage) + 1;

      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
        return;
      }

      licorRefs.current[lastAddedLicorId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    const timer = setTimeout(() => setLastAddedLicorId(null), 1000);
    return () => clearTimeout(timer);
  }, [lastAddedLicorId, licoresOrdenados, currentPage, itemsPerPage]);

  const hasAdvancedFilters = Object.values(advancedFilters).some(Boolean);
  const hasAnyFilter = Boolean(searchTerm || typeFilter || hasAdvancedFilters);

  const handleAdvancedFilterChange = (key: AdvancedFilterKey, value: string) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    onSearchChange('');
    onTypeFilterChange('');
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
    setIsAdvancedFiltersOpen(false);
  };

  const totalBottles = Object.values(cantidades).reduce((sum, item) => sum + item.botellas, 0);
  const totalCases = Object.values(cantidades).reduce((sum, item) => sum + item.cajas, 0);
  const hasSelectedItems = Object.values(cantidades).some(
    (item) => item.botellas > 0 || item.cajas > 0,
  );

  return (
    <section className="space-y-3 sm:space-y-4 lg:space-y-8">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 lg:gap-6">
          <div className="max-w-full flex-1 sm:max-w-md">
            <Input
              type="text"
              placeholder="Search by name, brand, type, origin..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label="Search liquors"
              className="rounded-xl px-4 py-3 text-sm sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"
              trailing={
                searchTerm ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search"
                    className="h-5 w-5 rounded-full bg-accent/20 text-accent hover:bg-accent/40"
                  >
                    ×
                  </Button>
                ) : (
                  <svg
                    className="h-4 w-4 text-accent/60 sm:h-5 sm:w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )
              }
            />
          </div>

          <div className="flex-1 sm:min-w-[200px] sm:flex-initial">
            <Select
              value={typeFilter}
              onValueChange={onTypeFilterChange}
              aria-label="Filter by type"
              className={cn(typeFilter === '' && 'text-contrast/80')}
              options={[
                { value: '', label: 'All Types' },
                ...uniqueTypes.map((type) => ({ value: type, label: type })),
              ]}
            />
          </div>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
            aria-expanded={isAdvancedFiltersOpen}
            className={cn(
              'group px-3 sm:rounded-2xl sm:px-4',
              hasAdvancedFilters && 'border-accent/50 bg-accent/20 text-accent hover:bg-accent/30',
            )}
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:scale-110 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
              />
            </svg>
            <span className="hidden sm:inline">Advanced</span>
            <svg
              className={cn(
                'h-3 w-3 transition-transform duration-base sm:h-4 sm:w-4',
                isAdvancedFiltersOpen && 'rotate-180',
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>

          {hasAnyFilter && (
            <div className="hidden animate-fade-in-up items-center sm:flex">
              <ClearFiltersButton onClick={clearAllFilters} />
            </div>
          )}
        </div>

        {hasAnyFilter && (
          <div className="mt-3 flex animate-fade-in-up justify-center sm:hidden">
            <ClearFiltersButton onClick={clearAllFilters} className="h-11 rounded-lg" />
          </div>
        )}
      </div>

      {isAdvancedFiltersOpen && (
        <AdvancedFilters
          values={advancedFilters}
          options={advancedOptions}
          onChange={handleAdvancedFilterChange}
          onClear={() => setAdvancedFilters(EMPTY_ADVANCED_FILTERS)}
        />
      )}

      <Card className="bg-cardBg/60 p-3 shadow-overlay sm:rounded-3xl sm:p-4 lg:p-8">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:mb-6 lg:mb-8">
          <h2 className="text-xl font-light text-foreground sm:text-2xl">Select liquors</h2>
          <div className="text-xs font-light text-contrast/60 sm:text-sm">
            <span>
              {licoresOrdenados.length} of {licores.length} products{' '}
              {searchTerm || typeFilter ? 'found' : 'available'}
            </span>
            {typeFilter && (
              <Badge tone="accent" className="ml-2 animate-fade-in-up">
                {typeFilter}
              </Badge>
            )}
          </div>
        </div>

        {loadingLicores ? (
          <div className="flex animate-fade-in-up items-center justify-center py-12">
            <Spinner size="lg" label="Loading liquors" />
          </div>
        ) : currentPageLicores.length === 0 ? (
          <EmptyState
            key={`no-results-${animationKey}`}
            className="animate-fade-in-up"
            title={
              hasAnyFilter ? (
                <>
                  No liquors found for {searchTerm && `"${searchTerm}"`}
                  {searchTerm && typeFilter && ' in '}
                  {typeFilter && `${typeFilter} type`}
                </>
              ) : (
                'No liquors registered.'
              )
            }
          />
        ) : (
          <ul className="grid gap-2 sm:gap-4 lg:gap-6">
            {currentPageLicores.map((licor, index) => {
              const cantidad = cantidades[licor.id] || { botellas: 0, cajas: 0 };
              const hasSelection = cantidad.botellas > 0 || cantidad.cajas > 0;

              return (
                <li
                  key={`${licor.id}-${animationKey}`}
                  ref={(element) => {
                    licorRefs.current[licor.id] = element;
                  }}
                  className={cn(
                    'group relative animate-fade-in-up rounded-xl border bg-gradient-to-r from-background/80 to-cardBg/80 p-3 opacity-0 backdrop-blur-sm transition-colors sm:rounded-2xl sm:p-4 lg:p-8',
                    hasSelection
                      ? 'border-accent/50 shadow-lg shadow-accent/10'
                      : 'border-border/30 hover:border-accent/30',
                  )}
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: 'forwards',
                  }}
                >
                  {hasSelection && (
                    <div className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-accent sm:right-4 sm:top-4 sm:h-3 sm:w-3" />
                  )}

                  <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                    <div className="flex-1">
                      <h3 className="mb-2 text-lg font-light text-foreground transition-colors group-hover:text-accent sm:text-xl lg:text-2xl">
                        {licor.name}
                      </h3>

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {licor.brand && <Badge>{licor.brand}</Badge>}
                        {licor.subcategory && <Badge tone="accent">{licor.subcategory}</Badge>}
                        {licor.age && <Badge tone="info">{licor.age}</Badge>}
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        {licor.abv && (
                          <MetaItem
                            icon={
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                              </svg>
                            }
                          >
                            {licor.abv}% ABV
                          </MetaItem>
                        )}
                        {licor.origin && (
                          <MetaItem
                            icon={
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
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
                            {licor.origin}
                          </MetaItem>
                        )}
                      </div>

                      <Badge tone="accent" emphasis className="backdrop-blur-sm">
                        {licor.type}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2 sm:gap-3 lg:min-w-[300px] lg:gap-4">
                      <QuantityStepper
                        label="Bottles"
                        unitLabel="bottle"
                        value={cantidad.botellas}
                        onDecrement={() => handleQuantityChange(licor.id, 'botellas', -1)}
                        onIncrement={() => handleQuantityChange(licor.id, 'botellas', 1)}
                      />
                      <QuantityStepper
                        label="Cases"
                        unitLabel="case"
                        value={cantidad.cajas}
                        onDecrement={() => handleQuantityChange(licor.id, 'cajas', -1)}
                        onIncrement={() => handleQuantityChange(licor.id, 'cajas', 1)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex animate-fade-in-up flex-col items-center justify-between gap-4 sm:mt-8 sm:flex-row">
            <div className="order-2 text-sm text-contrast/70 sm:order-1">
              Showing {startIndex + 1}-
              {Math.min(currentPage * itemsPerPage, licoresOrdenados.length)} of{' '}
              {licoresOrdenados.length} results
            </div>

            <div className="order-1 flex items-center gap-2 sm:order-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                  let pageNumber;
                  if (totalPages <= 5 || currentPage <= 3) {
                    pageNumber = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + index;
                  } else {
                    pageNumber = currentPage - 2 + index;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? 'primary' : 'secondary'}
                      size="sm"
                      className="min-w-[40px]"
                      aria-current={currentPage === pageNumber ? 'page' : undefined}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>

            <div className="order-3 flex items-center gap-2 text-sm text-contrast/70">
              <label htmlFor="items-per-page">Items per page:</label>
              <Select
                id="items-per-page"
                size="sm"
                value={String(itemsPerPage)}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
                className="w-auto min-w-[70px] border-contrast/10 bg-contrast/5 hover:border-contrast/20"
                options={ITEMS_PER_PAGE_OPTIONS.map((value) => ({
                  value: String(value),
                  label: String(value),
                }))}
              />
            </div>
          </div>
        )}

        {hasSelectedItems && (
          <div className="mt-4 rounded-xl border border-contrast/10 bg-contrast/5 p-3 backdrop-blur-sm sm:mt-6 sm:p-4 sm:rounded-2xl lg:mt-8 lg:p-6">
            <h3 className="mb-4 text-lg font-light text-foreground sm:text-xl">
              Selection Summary
            </h3>

            <div className="mb-4 space-y-2">
              {Object.entries(cantidades)
                .filter(([, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0)
                .map(([id, cantidad]) => {
                  const licor = licores.find((item) => item.id.toString() === id);
                  const parts = [];
                  if (cantidad.botellas > 0) {
                    parts.push(`${cantidad.botellas} ${pluralize(cantidad.botellas, 'bottle')}`);
                  }
                  if (cantidad.cajas > 0) {
                    parts.push(`${cantidad.cajas} ${pluralize(cantidad.cajas, 'case')}`);
                  }

                  return (
                    <div key={id} className="flex justify-between text-sm sm:text-base">
                      <span className="font-light text-contrast">{licor?.name}</span>
                      <span className="font-medium text-accent">{parts.join(' + ')}</span>
                    </div>
                  );
                })}
            </div>

            <div className="border-t border-contrast/10 pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-contrast/80">Total:</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-accent">
                    {totalBottles} {pluralize(totalBottles, 'Bottle')}
                  </span>
                  <span className="text-contrast/60">•</span>
                  <span className="font-semibold text-accent">
                    {totalCases} {pluralize(totalCases, 'Case')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col justify-center gap-3 sm:mt-6 sm:flex-row sm:gap-4 lg:mt-12">
          <Button
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={submitting || !hasSelectedItems}
            className="order-2 shadow-panel transition-transform hover:scale-105 disabled:transform-none sm:order-1 sm:rounded-2xl lg:text-lg"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel Movement
          </Button>
          <Button
            size="lg"
            onClick={onConfirm}
            disabled={submitting || !hasSelectedItems}
            data-checkout-button
            isLoading={submitting}
            className="order-1 transition-transform hover:scale-105 disabled:transform-none sm:order-2 sm:rounded-2xl lg:text-lg"
          >
            {!submitting && (
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {submitting ? 'Processing...' : 'Confirm Movement'}
          </Button>
        </div>
      </Card>
    </section>
  );
}
