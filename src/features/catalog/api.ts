'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { stockKeys } from '@/features/stock/keys';
import { MAX_PAGE_SIZE, type PageParams } from '@/lib/hooks';
import {
  api,
  assertOk,
  unwrap,
  type CreateBrandInput,
  type CreateCategoryInput,
  type CreateProductInput,
  type ProductListQuery,
  type UpdateBrandInput,
  type UpdateCategoryInput,
  type UpdateProductInput,
} from '@/lib/api';

/** Filters that reach the server. Everything the picker shows is one of these. */
export type ProductQuery = Omit<ProductListQuery, 'page' | 'pageSize'>;

export const catalogKeys = {
  all: ['products'] as const,
  products: (query: ProductQuery, page: PageParams) => ['products', query, page] as const,
  product: (id: string) => ['products', 'detail', id] as const,
  byIds: (ids: string[]) => ['products', 'by-ids', ids] as const,
  facets: ['product-facets'] as const,
  categories: ['categories'] as const,
  brands: ['brands'] as const,
};

export function useProducts(query: ProductQuery, page: PageParams) {
  return useQuery({
    queryKey: catalogKeys.products(query, page),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/products', { params: { query: { ...query, ...page } } })),
    // Every filter change and every page is a new query key. Without this the
    // list is replaced by a spinner on each keystroke that settles, which reads
    // as flicker, and paging blanks the table instead of swapping its rows.
    placeholderData: keepPreviousData,
  });
}

/**
 * Resolves a known set of products in one request.
 *
 * `status: 'all'` because a line already on the ledger may point at a product
 * that has since been deactivated, and dropping it would silently shorten what
 * is being restored.
 */
export function useProductsByIds(ids: string[], enabled = true) {
  const sorted = [...ids].sort();

  return useQuery({
    queryKey: catalogKeys.byIds(sorted),
    queryFn: async () =>
      unwrap(
        await api.GET('/api/v1/products', {
          params: {
            query: {
              productIds: sorted.join(','),
              status: 'all',
              // A draft with more distinct products than one page holds is not
              // something the capture screen can produce.
              pageSize: Math.min(sorted.length, MAX_PAGE_SIZE),
            },
          },
        }),
      ),
    enabled: enabled && sorted.length > 0,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: catalogKeys.product(id),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/products/{id}', { params: { path: { id } } })),
  });
}

export function useProductFacets() {
  return useQuery({
    queryKey: catalogKeys.facets,
    queryFn: async () => unwrap(await api.GET('/api/v1/products/facets')),
    staleTime: 5 * 60_000,
  });
}

/** The API caps a page at 100 and there are more brands than that. */
const MAX_REFERENCE_PAGES = 10;

/**
 * Walks every page of a reference list.
 *
 * These feed dropdowns, which are only honest when they hold every option;
 * they are also small and near-static, so one cached walk beats a typeahead.
 */
async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ data: T[]; meta: { pageCount: number } }>,
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; page <= MAX_REFERENCE_PAGES; page++) {
    const { data, meta } = await fetchPage(page);
    all.push(...data);

    if (page >= meta.pageCount) break;
  }

  return all;
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () =>
      fetchAllPages(async (page) =>
        unwrap(
          await api.GET('/api/v1/categories', {
            params: { query: { page, pageSize: MAX_PAGE_SIZE } },
          }),
        ),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: catalogKeys.brands,
    queryFn: () =>
      fetchAllPages(async (page) =>
        unwrap(
          await api.GET('/api/v1/brands', {
            params: { query: { page, pageSize: MAX_PAGE_SIZE } },
          }),
        ),
      ),
    staleTime: 5 * 60_000,
  });
}

/**
 * A product write moves more than the product list: the facets are built from
 * these columns, and the stock view reads the reorder threshold off the product.
 */
function invalidateCatalog(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
  void queryClient.invalidateQueries({ queryKey: catalogKeys.facets });
  void queryClient.invalidateQueries({ queryKey: stockKeys.all });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput) =>
      unwrap(await api.POST('/api/v1/products', { body: input })),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProductInput }) =>
      unwrap(await api.PATCH('/api/v1/products/{id}', { params: { path: { id } }, body: input })),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

/**
 * Renaming a category or a brand changes what every product row displays, so the
 * product lists go too, not just the reference list.
 */
function invalidateReference(queryClient: QueryClient, key: readonly string[]): void {
  void queryClient.invalidateQueries({ queryKey: key });
  void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) =>
      unwrap(await api.POST('/api/v1/categories', { body: input })),
    onSuccess: () => invalidateReference(queryClient, catalogKeys.categories),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      unwrap(await api.PATCH('/api/v1/categories/{id}', { params: { path: { id } }, body: input })),
    onSuccess: () => invalidateReference(queryClient, catalogKeys.categories),
  });
}

/** Only ever succeeds on an unused category: the API answers 409 while products reference it. */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      assertOk(await api.DELETE('/api/v1/categories/{id}', { params: { path: { id } } })),
    onSuccess: () => invalidateReference(queryClient, catalogKeys.categories),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBrandInput) =>
      unwrap(await api.POST('/api/v1/brands', { body: input })),
    onSuccess: () => invalidateReference(queryClient, catalogKeys.brands),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateBrandInput }) =>
      unwrap(await api.PATCH('/api/v1/brands/{id}', { params: { path: { id } }, body: input })),
    onSuccess: () => invalidateReference(queryClient, catalogKeys.brands),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      assertOk(await api.DELETE('/api/v1/brands/{id}', { params: { path: { id } } })),
    onSuccess: () => invalidateReference(queryClient, catalogKeys.brands),
  });
}
