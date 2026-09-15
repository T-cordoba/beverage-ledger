/**
 * The largest page the API will serve. Mirrors the `@Max(100)` on its pagination
 * DTO: asking for more is a 400, not a bigger page.
 */
export const MAX_PAGE_SIZE = 100;

/** Offered in the page-size picker. */
export const PAGE_SIZES = [10, 25, 50, MAX_PAGE_SIZE] as const;

export const DEFAULT_PAGE_SIZE = 10;

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
