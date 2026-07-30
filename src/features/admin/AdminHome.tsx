'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { EmptyState, Spinner } from '@/components/ui';
import { ADMIN_NAVIGATION, visibleNavigation } from '@/config/navigation';
import { useAuth } from '@/features/auth';

/**
 * /admin has no content of its own: it forwards to the first section the session
 * can open. Which one that is depends on permissions, so the decision cannot
 * happen on the server — the session lives in the browser.
 */
export function AdminHome() {
  const { can } = useAuth();
  const router = useRouter();
  const [first] = visibleNavigation(ADMIN_NAVIGATION, can);

  useEffect(() => {
    if (first) router.replace(first.href);
  }, [first, router]);

  if (!first) {
    return (
      <EmptyState
        title="Nothing here for your role."
        description="Administration covers users, the catalogue taxonomy, branding and the audit log."
      />
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" label="Opening administration" />
    </div>
  );
}
