import '@/styles/globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { BRAND } from '@/config/branding';
import { TIMEZONE_COOKIE, TimeZoneSync } from '@/i18n';
import { Providers } from './providers';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');

  return {
    title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
    description: t('description'),
    icons: { icon: '/favicon.ico' },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const timeZone = (await cookies()).get(TIMEZONE_COOKIE)?.value ?? null;

  return (
    <html lang={locale}>
      <body>
        {/* Messages and formats come off the server config, so no props here. */}
        <NextIntlClientProvider>
          <TimeZoneSync current={timeZone} />
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
