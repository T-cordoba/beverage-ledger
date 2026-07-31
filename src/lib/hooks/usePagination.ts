'use client';

import { useState } from 'react';

/**
 * The largest page the API will serve. Mirrors the `@Max(100)` on its pagination
 * DTO: asking for more is a 400, not a bigger page.
 */
export const MAX_PAGE_SIZE = 100;

/** Offered in the page-size picker. */
export const PAGE_SIZES = [10, 25, 50, MAX_PAGE_SIZE] as const;

export const DEFAULT_PAGE_SIZE = 25;

/** What every list hook spreads into its query params. */
export interface PageParams {
  page: number;
  pageSize: number;
}

export interface PaginationState extends PageParams {
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

/**
 * Page and page size for one list.
 *
 * `filterKey` is whatever identifies the filters in force. When they change the
 * reader has to go back to page 1: page 7 of a result set that now has two pages
 * answers with nothing, and an empty screen reads as broken rather than filtered.
 */
export function usePagination(
  filterKey: string,
  initialPageSize = DEFAULT_PAGE_SIZE,
): PaginationState {
  const [page, setPage] = useState(1);
  const [pageSize, setStoredPageSize] = useState(initialPageSize);
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);

  // Adjusted during render rather than in an effect: an effect would paint the
  // empty page once before correcting itself.
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

  return {
    page,
    pageSize,
    setPage,
    setPageSize: (next: number) => {
      setStoredPageSize(next);
      // The same page number covers a different slice at a new size, and page 9
      // of ten-per-page is off the end at a hundred.
      setPage(1);
    },
  };
}
