'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionQueryKey } from '@/features/auth';
import type { PageParams } from '@/lib/hooks';
import {
  api,
  unwrap,
  type AuditLogListQuery,
  type CreateUserInput,
  type UpdateOrganizationInput,
  type UpdateUserInput,
} from '@/lib/api';

export type AuditQuery = Omit<AuditLogListQuery, 'page' | 'pageSize'>;

export const adminKeys = {
  users: ['users'] as const,
  usersPage: (page: PageParams) => ['users', page] as const,
  organization: ['organization'] as const,
  auditLogs: (query: AuditQuery, page: PageParams) => ['audit-logs', query, page] as const,
};

export function useUsers(page: PageParams, enabled = true) {
  return useQuery({
    queryKey: adminKeys.usersPage(page),
    queryFn: async () => unwrap(await api.GET('/api/v1/users', { params: { query: page } })),
    placeholderData: keepPreviousData,
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

export function useAuditLogs(query: AuditQuery, page: PageParams) {
  return useQuery({
    queryKey: adminKeys.auditLogs(query, page),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/audit-logs', { params: { query: { ...query, ...page } } })),
    placeholderData: keepPreviousData,
  });
}
