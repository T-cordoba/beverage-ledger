import type { ReactNode } from 'react';
import { BRAND } from '@/config/branding';

/**
 * The full-page shell for a dead end: a route that does not exist, or a render
 * that threw. Both live outside every other layout — Next renders `not-found`
 * and `error` under the root layout alone — so the framing has to come from here.
 */
export function StatusScreen({
  code,
  title,
  description,
  children,
}: {
  /** The HTTP-ish status, shown large. Omitted when there is no number to give. */
  code?: string;
  title: string;
  description: string;
  /** The way out: one or two links or buttons. */
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center text-foreground">
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, not a remote upload */}
      <img src={BRAND.logoSrc} alt={BRAND.name} className="h-16 w-auto" />

      {code && <p className="text-6xl font-light text-accent/40 sm:text-7xl">{code}</p>}

      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{title}</h1>
        <p className="text-sm text-contrast/60">{description}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">{children}</div>
    </div>
  );
}
