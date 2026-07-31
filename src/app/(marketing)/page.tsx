import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, Button, Card, Reveal } from '@/components/ui';
import { ROUTES } from '@/config/navigation';

const FEATURES = ['ledger', 'stock', 'roles', 'reports'] as const;
const STEPS = ['capture', 'confirm', 'read'] as const;
const QUESTIONS = ['locations', 'mistakes', 'cases', 'roles'] as const;

/** Between siblings in a row. Long enough to read as a sequence, short enough not to wait. */
const STAGGER_MS = 60;

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      // The sticky nav would otherwise cover the heading an anchor jumps to.
      className="scroll-mt-20 border-t border-border/40 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <Reveal>
          <header className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-light text-foreground sm:text-3xl">{title}</h2>
            {subtitle && <p className="text-base text-contrast/60">{subtitle}</p>}
          </header>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const t = useTranslations('marketing');

  return (
    <>
      <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto flex max-w-3xl animate-fade-in-up flex-col items-center gap-6 text-center">
          <Badge tone="accent">{t('hero.eyebrow')}</Badge>

          <h1 className="text-4xl font-light leading-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>

          <p className="max-w-2xl text-base text-contrast/70 sm:text-lg">{t('hero.subtitle')}</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={ROUTES.signIn}>{t('hero.primary')}</Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <a href="#how">{t('hero.secondary')}</a>
            </Button>
          </div>

          <p className="text-sm text-contrast/50">{t('hero.note')}</p>
        </div>
      </section>

      <Section id="features" title={t('features.title')} subtitle={t('features.subtitle')}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <li key={feature}>
              <Reveal delayMs={index * STAGGER_MS} className="h-full">
                <Card className="h-full space-y-2 bg-contrast/5">
                  <h3 className="text-lg font-medium text-accent">
                    {t(`features.items.${feature}.title`)}
                  </h3>
                  <p className="text-sm text-contrast/70">{t(`features.items.${feature}.body`)}</p>
                </Card>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="how" title={t('how.title')} subtitle={t('how.subtitle')}>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step}>
              <Reveal delayMs={index * STAGGER_MS} className="space-y-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent"
                >
                  {index + 1}
                </span>
                <h3 className="text-lg font-medium text-foreground">
                  {t(`how.steps.${step}.title`)}
                </h3>
                <p className="text-sm text-contrast/70">{t(`how.steps.${step}.body`)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="faq" title={t('faq.title')}>
        <div className="max-w-3xl divide-y divide-border/40">
          {QUESTIONS.map((question) => (
            // Native disclosure: keyboard, screen readers and deep links work
            // without a line of JavaScript.
            <details key={question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-foreground marker:content-none hover:text-accent">
                {t(`faq.items.${question}.question`)}
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-accent/60 transition-transform duration-base group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="pt-3 text-sm text-contrast/70">{t(`faq.items.${question}.answer`)}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="border-t border-border/40 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <Card className="mx-auto flex max-w-4xl flex-col items-center gap-4 border-accent/30 bg-accent/5 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-light text-foreground sm:text-3xl">{t('cta.title')}</h2>
            <p className="max-w-2xl text-base text-contrast/70">{t('cta.body')}</p>
            <Button size="lg" asChild>
              <Link href={ROUTES.signIn}>{t('cta.primary')}</Link>
            </Button>
          </Card>
        </Reveal>
      </section>
    </>
  );
}
