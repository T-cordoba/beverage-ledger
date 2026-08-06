'use client';

import { useState } from 'react';

/**
 * Tells a refetch the reader asked for apart from one the cache decided on.
 *
 * TanStack's `isFetching` covers both, which makes it the wrong thing to put a
 * skeleton behind: every mutation invalidates its list, and a table that blanks
 * into ghost rows after each save is a flicker nobody asked for. It is also the
 * wrong thing to leave out — pressing refresh and seeing nothing happen reads as
 * a dead button.
 *
 * True only between the click and the answer, which is exactly the window where
 * showing the work is honest.
 */
export function useManualRefresh(refetch: () => Promise<unknown>): {
  refresh: () => void;
  isRefreshing: boolean;
} {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = () => {
    setIsRefreshing(true);
    void refetch().finally(() => setIsRefreshing(false));
  };

  return { refresh, isRefreshing };
}
