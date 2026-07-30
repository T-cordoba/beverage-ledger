'use client';

import { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/lib/hooks';
import type { ProductQuery } from './api';

export const CATALOG_FILTER_KEYS = [
  'categoryId',
  'brandId',
  'origin',
  'subcategory',
  'age',
  'abv',
] as const;

export type CatalogFilterKey = (typeof CATALOG_FILTER_KEYS)[number];

/** From the contract, so a renamed value breaks the build and not a request. */
export type ProductStatus = NonNullable<ProductQuery['status']>;

export const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Deactivated' },
  { value: 'all', label: 'Any status' },
];

/** Every filter is a string here; '' means "no filter", which is what the Select speaks. */
export type CatalogFilterValues = Record<CatalogFilterKey, string>;

const EMPTY_FILTERS: CatalogFilterValues = {
  categoryId: '',
  brandId: '',
  origin: '',
  subcategory: '',
  age: '',
  abv: '',
};

export interface CatalogFiltersState {
  search: string;
  setSearch: (value: string) => void;
  filters: CatalogFilterValues;
  setFilter: (key: CatalogFilterKey, value: string) => void;
  status: ProductStatus;
  setStatus: (value: ProductStatus) => void;
  clearAll: () => void;
  clearFilters: () => void;
  hasFilters: boolean;
  hasAny: boolean;
  /** What actually travels to the API: empty values dropped, search debounced. */
  query: ProductQuery;
}

export function useCatalogFilters(): CatalogFiltersState {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilterValues>(EMPTY_FILTERS);
  const [status, setStatus] = useState<ProductStatus>('active');
  const debouncedSearch = useDebouncedValue(search);

  const setFilter = useCallback((key: CatalogFilterKey, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const clearAll = useCallback(() => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setStatus('active');
  }, []);

  const hasFilters = CATALOG_FILTER_KEYS.some((key) => filters[key] !== '');

  const query = useMemo<ProductQuery>(
    () => ({
      status,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.origin ? { origin: filters.origin } : {}),
      ...(filters.subcategory ? { subcategory: filters.subcategory } : {}),
      ...(filters.age ? { age: filters.age } : {}),
      ...(filters.abv ? { abv: Number(filters.abv) } : {}),
    }),
    [debouncedSearch, filters, status],
  );

  return {
    search,
    setSearch,
    filters,
    setFilter,
    status,
    setStatus,
    clearAll,
    clearFilters,
    hasFilters,
    hasAny: hasFilters || search !== '' || status !== 'active',
    query,
  };
}
