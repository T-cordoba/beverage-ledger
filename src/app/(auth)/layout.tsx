import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset, not a remote upload */}
          <img src="/bl-logo.png" alt="Beverage Ledger" className="h-20 w-auto" />
          <p className="text-sm font-light text-contrast/70">Liquor inventory management</p>
        </div>

        {children}
      </div>
    </div>
  );
}
