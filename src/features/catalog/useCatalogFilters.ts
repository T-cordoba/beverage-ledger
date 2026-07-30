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
  /**
   * Active or inactive, never both: the API's `isActive` defaults to true when
   * omitted, so there is no "any status" to ask for.
   */
  isActive: boolean;
  setIsActive: (value: boolean) => void;
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
  const [isActive, setIsActive] = useState(true);
  const debouncedSearch = useDebouncedValue(search);

  const setFilter = useCallback((key: CatalogFilterKey, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const clearAll = useCallback(() => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setIsActive(true);
  }, []);

  const hasFilters = CATALOG_FILTER_KEYS.some((key) => filters[key] !== '');

  const query = useMemo<ProductQuery>(
    () => ({
      isActive,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.origin ? { origin: filters.origin } : {}),
      ...(filters.subcategory ? { subcategory: filters.subcategory } : {}),
      ...(filters.age ? { age: filters.age } : {}),
      ...(filters.abv ? { abv: Number(filters.abv) } : {}),
    }),
    [debouncedSearch, filters, isActive],
  );

  return {
    search,
    setSearch,
    filters,
    setFilter,
    isActive,
    setIsActive,
    clearAll,
    clearFilters,
    hasFilters,
    hasAny: hasFilters || search !== '' || !isActive,
    query,
  };
}
