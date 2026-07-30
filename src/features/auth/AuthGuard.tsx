'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth, useSignInPath } from './auth-context';

/**
 * Guards the authenticated area from the client, not from middleware.
 *
 * The session is an in-memory access token plus a refresh cookie that is
 * httpOnly, scoped to the API's `/api/v1/auth` path and, in production, set by
 * a different origin altogether. The Next server therefore cannot see it: a
 * middleware check would either always pass or always fail. Authorization is
 * the API's job anyway — this only avoids rendering a screen that is about to
 * answer 401.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const signInPath = useSignInPath();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(signInPath);
    }
  }, [isAuthenticated, isLoading, router, signInPath]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" label="Loading your session" />
      </div>
    );
  }

  return <>{children}</>;
}
