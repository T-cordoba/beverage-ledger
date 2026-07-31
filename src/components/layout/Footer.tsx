import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BRAND } from '@/config/branding';
import { MARKETING_SECTIONS, ROUTES } from '@/config/navigation';

export function Footer() {
  const t = useTranslations('marketing');

  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a static asset, not a remote upload */}
            <img src={BRAND.logoSrc} alt="" className="h-8 w-auto" aria-hidden="true" />
            <span className="text-sm font-light text-foreground">{BRAND.name}</span>
          </div>
          <p className="max-w-sm text-sm text-contrast/60">{t('footer.tagline')}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-contrast/60">
            {t('footer.sections')}
          </h2>
          <ul className="space-y-2 text-sm">
            {MARKETING_SECTIONS.map((section) => (
              <li key={section}>
                <a href={`#${section}`} className="text-contrast/70 hover:text-accent">
                  {t(`nav.${section}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-contrast/60">
            {t('footer.account')}
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={ROUTES.signIn} className="text-contrast/70 hover:text-accent">
                {t('nav.signIn')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/40">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-contrast/50 sm:px-6 lg:px-8">
          {/* A string, not a number: ICU would group it into "2.026" in Spanish. */}
          {t('footer.rights', { year: String(new Date().getFullYear()), brand: BRAND.name })}
        </p>
      </div>
    </footer>
  );
}
