'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

/**
 * The largest page the API will serve. Mirrors the `@Max(100)` on its pagination
 * DTO: asking for more is a 400, not a bigger page.
 */
export const MAX_PAGE_SIZE = 100;

/** Offered in the page-size picker. */
export const PAGE_SIZES = [10, 25, 50, MAX_PAGE_SIZE] as const;

export const DEFAULT_PAGE_SIZE = 10;

const STORAGE_KEY = 'beverage-ledger:page-size';

/** What every list hook spreads into its query params, and nothing else. */
export interface PageParams {
  page: number;
  pageSize: number;
}

/**
 * The page size is one preference, not one per list.
 *
 * Someone who asks for fifty rows is telling us about their screen, and having
 * to say it again on every table reads as the app forgetting. It lives outside
 * React so that every mounted list moves together, and in `localStorage` so it
 * survives a reload.
 */
const listeners = new Set<() => void>();

let preferred: number | null = null;

function isOffered(size: number): boolean {
  return (PAGE_SIZES as readonly number[]).includes(size);
}

function readPreferredPageSize(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return isOffered(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    // Private mode, or storage denied. The default is a fine answer.
    return DEFAULT_PAGE_SIZE;
  }
}

function getPreferredPageSize(): number {
  preferred ??= readPreferredPageSize();
  return preferred;
}

/** The server has no storage to read, and must agree with the first client render. */
function getDefaultPageSize(): number {
  return DEFAULT_PAGE_SIZE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storePreferredPageSize(size: number): void {
  preferred = size;

  try {
    window.localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    // Unwritable storage still leaves the choice in force for this session.
  }

  for (const listener of listeners) listener();
}

export interface PaginationState {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  /**
   * Goes on whatever wraps the rows. Turning the page scrolls it back into
   * view, so a new page starts at its first row instead of wherever the last
   * one happened to be read — landing halfway down page four reads as content
   * that did not change. Give it a `scroll-mt-*` clear of the sticky topbar.
   *
   * Left unattached, the window goes to the top instead, which is right for a
   * list that owns its whole screen and wrong for one that shares it.
   */
  anchorRef: React.RefObject<HTMLDivElement | null>;
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
export function usePagination(filterKey: string): PaginationState {
  const pageSize = useSyncExternalStore(subscribe, getPreferredPageSize, getDefaultPageSize);
  const anchorRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ filterKey, pageSize });

  // Adjusted during render rather than in an effect: an effect would paint the
  // empty page once before correcting itself. The page size is in here too
  // because another list may have changed it — the same page number covers a
  // different slice at a new size, and page 9 of ten-per-page is off the end at
  // a hundred.
  if (applied.filterKey !== filterKey || applied.pageSize !== pageSize) {
    setApplied({ filterKey, pageSize });
    setPage(1);
  }

  const goToPage = useCallback((next: number) => {
    setPage(next);

    // Smoothness is the stylesheet's call: `scroll-behavior` is set globally and
    // already turned off under prefers-reduced-motion.
    if (anchorRef.current) anchorRef.current.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }, []);

  return {
    page,
    pageSize,
    params: { page, pageSize },
    anchorRef,
    setPage: goToPage,
    setPageSize: storePreferredPageSize,
  };
}
