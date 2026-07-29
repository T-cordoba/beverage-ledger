import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Beverage Ledger',
  description: 'Professional liquor inventory management system',
  // Solo se declaran los iconos que existen en public/. Las variantes PNG
  // (favicon-16x16, apple-touch-icon, android-chrome-*) nunca se generaron.
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // El copy de la interfaz está en inglés. Pasa a ser dinámico con i18n (Fase 7).
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
