import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Keys } from '@/components/ui';
import { SHORTCUTS } from '@/config/shortcuts';

const SECTIONS = [
  'start',
  'roles',
  'movements',
  'drafts',
  'stock',
  'reports',
  'setup',
  'settings',
  'shortcuts',
  'glossary',
  'contact',
] as const;

type Section = (typeof SECTIONS)[number];

const ROLES = ['OPERATOR', 'MANAGER', 'ORG_ADMIN'] as const;

/**
 * Who may do what, in the role order above. Restates the API's permission matrix
 * for reading; the API stays the authority and the UI never reads this.
 */
const ROLE_MATRIX = [
  ['outbound', [true, true, true]],
  ['inbound', [false, true, true]],
  ['adjustment', [false, true, true]],
  ['transfer', [false, true, true]],
  ['cancel', [false, true, true]],
  ['stock', [true, true, true]],
  ['reports', [false, true, true]],
  ['catalog', [false, false, true]],
  ['users', [false, false, true]],
  ['audit', [false, false, true]],
] as const;

const START_STEPS = ['signIn', 'dashboard', 'record', 'check'] as const;
const MOVEMENT_TYPES = ['outbound', 'inbound', 'adjustment', 'transfer'] as const;
const SETUP_ITEMS = ['organization', 'users', 'catalog', 'audit'] as const;
const GLOSSARY = ['movement', 'draft', 'history', 'kardex', 'minimum', 'case', 'location'] as const;

function GuideSection({
  id,
  title,
  children,
}: Readonly<{ id: Section; title: string; children: ReactNode }>) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 border-t border-border/40 pt-8">
      <h2 className="text-xl font-light text-foreground sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-contrast/80 sm:text-base">
        {children}
      </div>
    </section>
  );
}

/** The user guide: how the app is used and set up, readable without an account. */
export function HelpGuide() {
  const t = useTranslations('help.guide');
  const tSections = useTranslations('help.guide.sections');
  const tRoles = useTranslations('admin.roles');
  const tShortcuts = useTranslations('help.menu.shortcuts');

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
      <nav aria-label={t('contents')} className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-contrast/60">
          {t('contents')}
        </p>
        <ul className="space-y-1.5 text-sm">
          {SECTIONS.map((section) => (
            <li key={section}>
              <a href={`#${section}`} className="text-contrast/70 hover:text-accent">
                {tSections(`${section}.title`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="min-w-0 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-light text-foreground sm:text-4xl">{t('title')}</h1>
          <p className="text-base text-contrast/60">{t('subtitle')}</p>
        </header>

        <GuideSection id="start" title={tSections('start.title')}>
          <p>{tSections('start.intro')}</p>
          <ol className="list-decimal space-y-2 pl-5">
            {START_STEPS.map((step) => (
              <li key={step}>{tSections(`start.steps.${step}`)}</li>
            ))}
          </ol>
        </GuideSection>

        <GuideSection id="roles" title={tSections('roles.title')}>
          <p>{tSections('roles.intro')}</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/60 text-xs uppercase tracking-wider text-contrast/60">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {tSections('roles.action')}
                  </th>
                  {ROLES.map((role) => (
                    <th key={role} scope="col" className="px-4 py-3 text-center font-medium">
                      {tRoles(role)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_MATRIX.map(([action, allowed]) => (
                  <tr key={action} className="border-t border-border/60">
                    <th scope="row" className="px-4 py-2.5 font-normal text-foreground">
                      {tSections(`roles.actions.${action}`)}
                    </th>
                    {allowed.map((can, index) => (
                      <td
                        key={ROLES[index]}
                        className={
                          can
                            ? 'px-4 text-center text-success'
                            : 'px-4 text-center text-contrast/40'
                        }
                      >
                        {can ? `✓ ${tSections('roles.allowed')}` : tSections('roles.denied')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GuideSection>

        <GuideSection id="movements" title={tSections('movements.title')}>
          <p>{tSections('movements.intro')}</p>
          <ul className="list-disc space-y-2 pl-5">
            {MOVEMENT_TYPES.map((type) => (
              <li key={type}>{tSections(`movements.types.${type}`)}</li>
            ))}
          </ul>
          <p>{tSections('movements.flow')}</p>
          <p>{tSections('movements.limit')}</p>
          <p>{tSections('movements.fix')}</p>
        </GuideSection>

        {(['drafts', 'stock', 'reports'] as const).map((section) => (
          <GuideSection key={section} id={section} title={tSections(`${section}.title`)}>
            <p>{tSections(`${section}.body`)}</p>
          </GuideSection>
        ))}

        <GuideSection id="setup" title={tSections('setup.title')}>
          <ul className="list-disc space-y-2 pl-5">
            {SETUP_ITEMS.map((item) => (
              <li key={item}>{tSections(`setup.items.${item}`)}</li>
            ))}
          </ul>
        </GuideSection>

        <GuideSection id="settings" title={tSections('settings.title')}>
          <p>{tSections('settings.body')}</p>
        </GuideSection>

        <GuideSection id="shortcuts" title={tSections('shortcuts.title')}>
          <p>{tSections('shortcuts.body')}</p>
          <dl className="space-y-2">
            {SHORTCUTS.map(({ keys, action }) => (
              <div key={action} className="flex items-center justify-between gap-4">
                <dt>{tShortcuts(action)}</dt>
                <dd>
                  <Keys keys={keys} />
                </dd>
              </div>
            ))}
          </dl>
        </GuideSection>

        <GuideSection id="glossary" title={tSections('glossary.title')}>
          <ul className="space-y-2">
            {GLOSSARY.map((term) => (
              <li key={term}>{tSections(`glossary.terms.${term}`)}</li>
            ))}
          </ul>
        </GuideSection>

        <GuideSection id="contact" title={tSections('contact.title')}>
          <p>{tSections('contact.body')}</p>
        </GuideSection>
      </article>
    </div>
  );
}
