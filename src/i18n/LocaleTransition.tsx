'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useTransition, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { setLocale } from './actions';
import type { Locale } from './config';

interface LocaleTransitionValue {
  isChanging: boolean;
  change: (locale: Locale) => void;
}

const LocaleTransitionContext = createContext<LocaleTransitionValue | null>(null);

export function useLocaleTransition(): LocaleTransitionValue {
  const value = useContext(LocaleTransitionContext);

  if (!value) {
    throw new Error('useLocaleTransition must be used inside LocaleTransitionProvider');
  }

  return value;
}

/**
 * Dims the page while the language is being swapped.
 *
 * The messages come down from the root layout, so changing one is a server
 * render away rather than a state update. Without something covering that gap
 * the page sits in the old language and then snaps into the new one.
 *
 * The transition is owned here and not in the switcher because the switcher sits
 * inside the topbar, and what has to fade is the whole document.
 */
export function LocaleTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChanging, startTransition] = useTransition();

  const change = (locale: Locale) => {
    startTransition(async () => {
      await setLocale(locale);
      // Only a fresh server render carries the new messages down.
      router.refresh();
    });
  };

  return (
    <LocaleTransitionContext.Provider value={{ isChanging, change }}>
      {/* Opacity rather than anything that removes the content: the layout has
          to hold still, or the page collapses and rebuilds mid-swap. */}
      <div className={cn('transition-opacity duration-slow', isChanging && 'opacity-40')}>
        {children}
      </div>
    </LocaleTransitionContext.Provider>
  );
}
