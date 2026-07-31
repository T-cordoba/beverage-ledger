import type { PageParams } from '@/lib/hooks';
import type { StockQuery } from './api';

/**
 * Kept apart from the hooks so a mutation elsewhere can invalidate stock without
 * importing this feature's components — a barrel import would close a cycle
 * between movements and stock, which reference each other's views.
 */
export const stockKeys = {
  all: ['stock'] as const,
  levels: (query: StockQuery, page: PageParams) => ['stock', 'levels', query, page] as const,
  low: (limit: number) => ['stock', 'low', limit] as const,
  availability: (productIds: string[], locationId?: string) =>
    ['stock', 'availability', locationId ?? 'default', productIds] as const,
  kardex: (productId: string, locationId: string | undefined, page: PageParams) =>
    ['stock', 'kardex', productId, locationId ?? 'default', page] as const,
};
