'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { setTimeZone } from './actions';

/**
 * Reports the browser's time zone to the server, once, so timestamps read in the
 * user's own hours.
 *
 * The zone cannot simply be resolved where the dates are rendered: the first
 * render happens on the server, and it has no way to know where the request came
 * from — a fetch carries a locale header but never a zone. So the browser writes
 * what it knows into a cookie and asks for one more render, which is also what
 * keeps the two renders in agreement instead of hydrating a UTC timestamp over a
 * local one.
 *
 * It costs a refresh on the very first visit and nothing after that.
 */
export function TimeZoneSync({ current }: { current: string | null }) {
  const router = useRouter();
  // A refresh remounts nothing, but a re-render must not fire a second write.
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) {
      return;
    }

    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!browser || browser === current) {
      return;
    }

    hasSynced.current = true;

    void setTimeZone(browser).then(() => router.refresh());
  }, [current, router]);

  return null;
}
