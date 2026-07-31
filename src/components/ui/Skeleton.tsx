import { cn } from '@/lib/utils';

/**
 * A placeholder shaped like the thing that is coming.
 *
 * Preferred over a centred spinner wherever the final size is known: a spinner
 * occupies one line and then the real content shoves the page around, which is
 * the jolt this avoids. Always `aria-hidden` — the announcement belongs to the
 * region that is busy, not to each grey box inside it.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-md bg-contrast/10', className)}
    />
  );
}

/** A stack of lines, for a block of text whose length is not known. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn('block space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          // The last line stops short, the way a paragraph does.
          className={cn('h-4', index === lines - 1 && 'w-2/3')}
        />
      ))}
    </span>
  );
}
