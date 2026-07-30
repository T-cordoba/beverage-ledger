'use client';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { stockKeys } from '@/features/stock/keys';
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
export type ProductQuery = Omit<ProductListQuery, 'cursor'>;

export const catalogKeys = {
  all: ['products'] as const,
  products: (query: ProductQuery) => ['products', query] as const,
  product: (id: string) => ['products', 'detail', id] as const,
  facets: ['product-facets'] as const,
  categories: ['categories'] as const,
  brands: ['brands'] as const,
};

const PAGE_SIZE = 25;

/** Cursor pages, so the list grows instead of jumping to a numbered page the API cannot address. */
export function useProducts(query: ProductQuery) {
  return useInfiniteQuery({
    queryKey: catalogKeys.products(query),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET('/api/v1/products', {
          params: { query: { ...query, limit: PAGE_SIZE, cursor: pageParam } },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    // Every filter change is a new query key. Without this the list is replaced
    // by a spinner on each keystroke that settles, which reads as flicker.
    placeholderData: keepPreviousData,
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
const REFERENCE_PAGE_SIZE = 100;

/**
 * Walks every page of a reference list.
 *
 * These feed dropdowns, which are only honest when they hold every option;
 * they are also small and near-static, so one cached walk beats a typeahead.
 */
async function fetchAllPages<T>(
  fetchPage: (
    cursor: string | undefined,
  ) => Promise<{ data: T[]; meta: { nextCursor: string | null } }>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_REFERENCE_PAGES; page++) {
    const { data, meta } = await fetchPage(cursor);
    all.push(...data);

    if (!meta.nextCursor) break;
    cursor = meta.nextCursor;
  }

  return all;
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () =>
      fetchAllPages(async (cursor) =>
        unwrap(
          await api.GET('/api/v1/categories', {
            params: { query: { limit: REFERENCE_PAGE_SIZE, cursor } },
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
      fetchAllPages(async (cursor) =>
        unwrap(
          await api.GET('/api/v1/brands', {
            params: { query: { limit: REFERENCE_PAGE_SIZE, cursor } },
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
