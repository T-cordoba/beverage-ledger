'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  applyPreferences,
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  type Preferences,
} from './preferences';

/** Fired on this tab, where the `storage` event never arrives. */
const CHANGED = 'beverage-ledger:preferences-changed';

let cachedRaw: string | null | undefined;
let cached: Preferences = DEFAULT_PREFERENCES;

/** Same object for the same stored string: useSyncExternalStore re-renders on identity. */
function snapshot(): Preferences {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PREFERENCES_KEY);
  } catch {
    // Blocked storage: the defaults stand, and changes last for this page.
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = {
        ...DEFAULT_PREFERENCES,
        ...(raw ? (JSON.parse(raw) as Partial<Preferences>) : {}),
      };
    } catch {
      cached = DEFAULT_PREFERENCES;
    }
  }
  return cached;
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * Per-device preferences: theme, contrast, text size and the dashboard layout.
 *
 * In localStorage rather than on the user: they describe a screen as much as a
 * person, and a phone and a bar terminal rarely want the same text size.
 */
export function usePreferences() {
  const preferences = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PREFERENCES);

  // "System" follows the OS live, which no stored value changes.
  useEffect(() => {
    if (preferences.theme !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const follow = () => applyPreferences(preferences);
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, [preferences]);

  const update = useCallback((patch: Partial<Preferences>) => {
    const next = { ...snapshot(), ...patch };
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the attributes below still change this page.
    }
    applyPreferences(next);
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  return { preferences, update };
}
