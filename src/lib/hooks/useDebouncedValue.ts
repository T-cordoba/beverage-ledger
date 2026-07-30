'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps a value still for `delayMs` before letting it through.
 *
 * Search is filtered server-side now, so a keystroke is a request; without this
 * a ten-letter query is ten of them and the answers can land out of order.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
