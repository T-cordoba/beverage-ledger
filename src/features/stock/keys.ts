import type { StockQuery } from './api';

/**
 * Kept apart from the hooks so a mutation elsewhere can invalidate stock without
 * importing this feature's components — a barrel import would close a cycle
 * between movements and stock, which reference each other's views.
 */
export const stockKeys = {
  all: ['stock'] as const,
  levels: (query: StockQuery) => ['stock', 'levels', query] as const,
  low: (limit: number) => ['stock', 'low', limit] as const,
  kardex: (productId: string, locationId?: string) =>
    ['stock', 'kardex', productId, locationId ?? 'default'] as const,
};
