'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionQueryKey } from '@/features/auth';
import {
  api,
  assertOk,
  unwrap,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@/lib/api';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) =>
      unwrap(await api.PATCH('/api/v1/users/me', { body: input })),
    // The name and the avatar head the topbar, which reads them from the session.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  });
}

/**
 * Changing the password revokes every refresh token, this device included, so
 * the caller has to end the local session too — there is nothing left to renew.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) =>
      assertOk(await api.PUT('/api/v1/users/me/password', { body: input })),
  });
}
