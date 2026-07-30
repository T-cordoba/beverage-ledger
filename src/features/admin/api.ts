'use client';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { sessionQueryKey } from '@/features/auth';
import {
  api,
  unwrap,
  type AuditLogListQuery,
  type CreateUserInput,
  type UpdateOrganizationInput,
  type UpdateUserInput,
} from '@/lib/api';

export type AuditQuery = Omit<AuditLogListQuery, 'cursor'>;

export const adminKeys = {
  users: ['users'] as const,
  organization: ['organization'] as const,
  auditLogs: (query: AuditQuery) => ['audit-logs', query] as const,
};

const PAGE_SIZE = 25;

export function useUsers(enabled = true) {
  return useInfiniteQuery({
    queryKey: adminKeys.users,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET('/api/v1/users', {
          params: { query: { limit: PAGE_SIZE, cursor: pageParam } },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) =>
      unwrap(await api.POST('/api/v1/users', { body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserInput }) =>
      unwrap(await api.PATCH('/api/v1/users/{id}', { params: { path: { id } }, body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useOrganization() {
  return useQuery({
    queryKey: adminKeys.organization,
    queryFn: async () => unwrap(await api.GET('/api/v1/organization')),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateOrganizationInput) =>
      unwrap(await api.PATCH('/api/v1/organization', { body: input })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.organization });
      // The session carries the trading name and the logo, which head every
      // screen: without this the topbar keeps the old branding until a reload.
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });
}

export function useAuditLogs(query: AuditQuery) {
  return useInfiniteQuery({
    queryKey: adminKeys.auditLogs(query),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET('/api/v1/audit-logs', {
          params: { query: { ...query, limit: PAGE_SIZE, cursor: pageParam } },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}
