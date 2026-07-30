import '@/styles/globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Beverage Ledger',
  description: 'Professional liquor inventory management system',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
