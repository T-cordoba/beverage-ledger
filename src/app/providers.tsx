'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { NotificationsProvider } from '@/components/ui';
import { AuthProvider } from '@/features/auth';
import { LocaleTransitionProvider } from '@/i18n';
import { createQueryClient } from '@/lib/query/query-client';

export function Providers({ children }: { children: ReactNode }) {
  // Created once per browser session, not per render: a client rebuilt on
  // re-render would drop the cache with it.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <AuthProvider>
          <LocaleTransitionProvider>{children}</LocaleTransitionProvider>
        </AuthProvider>
      </NotificationsProvider>
    </QueryClientProvider>
  );
}
