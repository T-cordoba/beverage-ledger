'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ROUTES, signInPath } from '@/config/navigation';
import {
  api,
  assertOk,
  ensureAccessToken,
  forgetSession,
  onSessionLost,
  refreshSession,
  storeSession,
  unwrap,
  type CurrentSession,
  type Permission,
  type SessionOrganization,
  type SessionUser,
} from '@/lib/api';

export const sessionQueryKey = ['session'] as const;

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  name: string;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: SessionUser | null;
  organization: SessionOrganization | null;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  signIn: (credentials: Credentials) => Promise<void>;
  register: (registration: Registration) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return auth;
}

/**
 * Reads the session, renewing the access token first.
 *
 * On a cold load there is no token in memory — only the refresh cookie — so
 * this is also what tells an anonymous visitor apart from a returning one.
 */
async function fetchSession(): Promise<CurrentSession | null> {
  const token = await ensureAccessToken();

  if (!token) return null;

  return unwrap(await api.GET('/api/v1/auth/me'));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: session, isPending } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    staleTime: Infinity,
    retry: false,
  });

  // A 401 anywhere in the app means the refresh token is gone or was revoked;
  // the cache belongs to a session that no longer exists.
  useEffect(
    () =>
      onSessionLost(() => {
        queryClient.setQueryData(sessionQueryKey, null);
        queryClient.removeQueries({ predicate: (query) => query.queryKey !== sessionQueryKey });
      }),
    [queryClient],
  );

  const signIn = useMutation({
    mutationFn: async (credentials: Credentials) => {
      storeSession(unwrap(await api.POST('/api/v1/auth/login', { body: credentials })));
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  }).mutateAsync;

  const register = useMutation({
    mutationFn: async (registration: Registration) => {
      storeSession(unwrap(await api.POST('/api/v1/auth/register', { body: registration })));
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  }).mutateAsync;

  const signOut = useCallback(async () => {
    try {
      assertOk(await api.POST('/api/v1/auth/logout'));
    } finally {
      // Even a failed logout ends the session on this device: the token stays
      // in memory otherwise, and the user asked to leave.
      forgetSession();
      queryClient.setQueryData(sessionQueryKey, null);
      queryClient.clear();
      router.push(ROUTES.signIn);
    }
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = session?.permissions ?? [];

    return {
      isLoading: isPending,
      isAuthenticated: session != null,
      user: session?.user ?? null,
      organization: session?.organization ?? null,
      permissions,
      can: (permission) => permissions.includes(permission),
      signIn: async (credentials) => {
        await signIn(credentials);
      },
      register: async (registration) => {
        await register(registration);
      },
      signOut,
    };
  }, [isPending, register, session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Trades the refresh cookie Google left behind for an access token.
 *
 * The OAuth callback carries no token by design — one in the redirect URL would
 * land in browser history, logs and the Referer header.
 */
export function useGoogleCallback(): { failed: boolean } {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { isError } = useQuery({
    queryKey: ['google-callback'],
    retry: false,
    gcTime: 0,
    queryFn: async () => {
      const session = await refreshSession();

      if (!session) {
        throw new Error('Google sign-in did not leave a session behind');
      }

      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      router.replace(ROUTES.movements);
      return session;
    },
  });

  return { failed: isError };
}

/** Where to send someone back to after they sign in. */
export function useSignInPath(): string {
  const pathname = usePathname();
  return signInPath(pathname);
}
