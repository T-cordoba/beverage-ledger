'use client';

import Link from 'next/link';
import { Button, Card, Spinner } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useGoogleCallback } from '@/features/auth';

/**
 * Where the API sends the browser back after Google.
 *
 * It arrives with the refresh cookie already set and no token in the URL, so
 * the only thing left to do is trade the cookie for one.
 */
export default function GoogleCallbackPage() {
  const { failed } = useGoogleCallback();

  if (failed) {
    return (
      <Card className="space-y-4 p-6 text-center sm:p-8">
        <h1 className="text-xl font-light text-foreground">Sign-in did not complete</h1>
        <p className="text-sm text-contrast/60">
          Google sent you back without a usable session. Please try again.
        </p>
        <Button asChild>
          <Link href={ROUTES.signIn}>Back to sign in</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <Spinner size="lg" label="Completing sign-in" />
      <p className="text-sm text-contrast/60">Completing sign-in…</p>
    </Card>
  );
}
