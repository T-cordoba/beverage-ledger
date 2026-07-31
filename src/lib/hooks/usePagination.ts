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

/** What every list hook spreads into its query params, and nothing else. */
export interface PageParams {
  page: number;
  pageSize: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  /**
   * The pair on its own, for spreading into a request.
   *
   * Separate from the state above because spreading the state sends the setters
   * to the server as query params too, and TypeScript will not catch it: the
   * excess-property check only fires on object literals, never on a variable
   * that happens to carry more than the parameter type asks for.
   */
  params: PageParams;
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
    params: { page, pageSize },
    setPage,
    setPageSize: (next: number) => {
      setStoredPageSize(next);
      // The same page number covers a different slice at a new size, and page 9
      // of ten-per-page is off the end at a hundred.
      setPage(1);
    },
  };
}
