'use client';

import { useEffect, useRef } from 'react';

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * `combo` is keys joined by `+`, e.g. `mod+z`, `mod+shift+z`, `/`. `mod` is Ctrl,
 * or ⌘ on a Mac. Shift is only checked when the combo names it: `?` already
 * takes Shift to type on most layouts.
 */
function matches(combo: string, event: KeyboardEvent): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts.at(-1);
  const wantsMod = parts.includes('mod');
  const hasMod = event.ctrlKey || event.metaKey;

  if (wantsMod !== hasMod || event.altKey) return false;
  if (parts.includes('shift') && !event.shiftKey) return false;
  if (wantsMod && !parts.includes('shift') && event.shiftKey) return false;
  return event.key.toLowerCase() === key;
}

/**
 * A document-wide keyboard shortcut.
 *
 * Ignored while typing in a field unless `inFields` is set, so `/` still types a
 * slash and Ctrl+Z still undoes the text in the field instead of the form.
 */
export function useShortcut(
  combos: string | string[],
  handler: () => void,
  { enabled = true, inFields = false }: { enabled?: boolean; inFields?: boolean } = {},
) {
  // Latest handler without re-subscribing on every render.
  const latest = useRef(handler);
  latest.current = handler;
  const list = [combos].flat().join(',');

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!inFields && isEditable(event.target)) return;
      if (!list.split(',').some((combo) => matches(combo, event))) return;
      event.preventDefault();
      latest.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, inFields, list]);
}
