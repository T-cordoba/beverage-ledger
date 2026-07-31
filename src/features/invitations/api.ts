'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '@/features/admin';
import {
  api,
  assertOk,
  unwrap,
  type AcceptInvitationInput,
  type CreateInvitationInput,
} from '@/lib/api';
import type { PageParams } from '@/lib/hooks';

export const invitationKeys = {
  all: ['invitations'] as const,
  page: (page: PageParams) => ['invitations', page] as const,
};

export function useInvitations(page: PageParams, enabled = true) {
  return useQuery({
    queryKey: invitationKeys.page(page),
    queryFn: async () => unwrap(await api.GET('/api/v1/invitations', { params: { query: page } })),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvitationInput) =>
      unwrap(await api.POST('/api/v1/invitations', { body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      assertOk(await api.DELETE('/api/v1/invitations/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

/**
 * What the link stands for, before anyone has proven anything.
 *
 * No retry: every failure here is the token being unusable, and asking again
 * cannot change that.
 */
export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: async () => unwrap(await api.POST('/api/v1/invitations/lookup', { body: { token } })),
    retry: false,
    gcTime: 0,
  });
}

/**
 * Takes up the invitation and opens a session.
 *
 * Accepting also lands a fresh member in the organization, so the admin lists
 * are dropped: whoever is looking at them is looking at a stale roll.
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AcceptInvitationInput) =>
      unwrap(await api.POST('/api/v1/invitations/accept', { body: input })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminKeys.users });
    },
  });
}
