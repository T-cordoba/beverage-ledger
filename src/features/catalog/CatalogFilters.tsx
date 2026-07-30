'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, type SelectOption } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useBrands, useCategories, useProductFacets } from './api';
import type { CatalogFilterKey, CatalogFiltersState } from './useCatalogFilters';

const toOptions = (values: string[], format?: (value: string) => string): SelectOption[] =>
  values.map((value) => ({ value, label: format ? format(value) : value }));

interface AdvancedField {
  key: CatalogFilterKey;
  label: string;
  anyLabel: string;
  options: SelectOption[];
}

export function CatalogFilters({ state }: { state: CatalogFiltersState }) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: facets } = useProductFacets();

  const advanced: AdvancedField[] = [
    {
      key: 'brandId',
      label: 'Brand',
      anyLabel: 'All brands',
      options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    },
    {
      key: 'origin',
      label: 'Origin',
      anyLabel: 'All origins',
      options: toOptions(facets?.origins ?? []),
    },
    {
      key: 'subcategory',
      label: 'Subcategory',
      anyLabel: 'All subcategories',
      options: toOptions(facets?.subcategories ?? []),
    },
    { key: 'age', label: 'Age', anyLabel: 'All ages', options: toOptions(facets?.ages ?? []) },
    {
      key: 'abv',
      label: 'ABV',
      anyLabel: 'All ABVs',
      options: toOptions((facets?.abvs ?? []).map(String), (value) => `${value}%`),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="max-w-full flex-1 sm:max-w-md">
          <Input
            type="search"
            placeholder="Search by name..."
            value={state.search}
            onChange={(event) => state.setSearch(event.target.value)}
            aria-label="Search products"
            trailing={
              <svg
                className="h-4 w-4 text-accent/60"
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
            }
          />
        </div>

        <div className="flex-1 sm:min-w-[200px] sm:flex-initial">
          <Select
            value={state.filters.categoryId}
            onValueChange={(value) => state.setFilter('categoryId', value)}
            aria-label="Filter by category"
            className={cn(state.filters.categoryId === '' && 'text-contrast/80')}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
          />
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => setIsAdvancedOpen((open) => !open)}
          aria-expanded={isAdvancedOpen}
          className={cn(
            'group px-3 sm:px-4',
            state.hasFilters && 'border-accent/50 bg-accent/20 text-accent hover:bg-accent/30',
          )}
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
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
          </svg>
          <span className="hidden sm:inline">Advanced</span>
          <svg
            className={cn(
              'h-3 w-3 transition-transform duration-base sm:h-4 sm:w-4',
              isAdvancedOpen && 'rotate-180',
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>

        {state.hasAny && (
          <Button variant="danger-outline" size="lg" onClick={state.clearAll}>
            Clear filters
          </Button>
        )}
      </div>

      {isAdvancedOpen && (
        <Card className="animate-fade-in-up bg-surface/40">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {advanced.map(({ key, label, anyLabel, options }) => (
              <div key={key}>
                <label
                  htmlFor={`catalog-filter-${key}`}
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-contrast/70"
                >
                  {label}
                </label>
                <Select
                  id={`catalog-filter-${key}`}
                  size="sm"
                  value={state.filters[key]}
                  onValueChange={(value) => state.setFilter(key, value)}
                  className={cn(
                    'border-contrast/10 bg-contrast/5 hover:border-contrast/20',
                    state.filters[key] === '' && 'text-contrast/60',
                  )}
                  options={[{ value: '', label: anyLabel }, ...options]}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={state.clearFilters}
              disabled={!state.hasFilters}
            >
              Clear advanced
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
