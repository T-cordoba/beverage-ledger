'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

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
 * How many rows the page being loaded will hold, so its skeleton is exactly as
 * tall as what replaces it.
 *
 * `total` is the count from the page before, which is the right number while the
 * filters have not changed — and when they have, the reader is back on page one
 * and a full page is the honest guess. Never zero: an empty result shows its own
 * empty state, and a table of no rows at all reads as broken mid-load.
 */
export function rowsOnPage(page: number, pageSize: number, total?: number): number {
  if (total === undefined) return pageSize;
  return Math.min(pageSize, Math.max(total - (page - 1) * pageSize, 1));
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

  // Asked for by a page turn, carried out by the effect below. A ref because it
  // is not something to render, only something the next commit has to remember.
  const shouldScroll = useRef(false);

  const goToPage = useCallback((next: number) => {
    setPage(next);
    shouldScroll.current = true;
  }, []);

  /**
   * Scrolls after the render that shows the new page, never during the click
   * that asked for it.
   *
   * Doing it in the handler aimed at the layout on its way out: the browser
   * started a smooth scroll, React then replaced the rows with skeletons, and
   * the correction Chrome applies to keep changed content visually still — its
   * scroll anchoring — undid the scroll while it was in flight. It only ever
   * worked for a page already in cache, where nothing is swapped for a skeleton
   * and the geometry never moves.
   */
  useEffect(() => {
    if (!shouldScroll.current) return;
    shouldScroll.current = false;

    const anchor = anchorRef.current;

    // Nothing anchored: the window goes to the top, which is right for a list
    // that owns its whole screen.
    if (!anchor) {
      window.scrollTo({ top: 0 });
      return;
    }

    // The skeletons give way to the real rows while this is still animating, and
    // anchoring would take the scroll back a second time.
    anchor.style.setProperty('overflow-anchor', 'none');

    // Smoothness is the stylesheet's call: `scroll-behavior` is set globally and
    // already turned off under prefers-reduced-motion.
    anchor.scrollIntoView({ block: 'start' });
  }, [page]);

  return {
    page,
    pageSize,
    params: { page, pageSize },
    anchorRef,
    setPage: goToPage,
    setPageSize: storePreferredPageSize,
  };
}
