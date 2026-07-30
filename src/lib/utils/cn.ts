import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes so the last conflicting utility wins.
 *
 * This is what lets a call site pass `className="px-2"` and override a
 * component's own `px-4` without `!important`, which is how the previous
 * button system ended up unreadable.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
