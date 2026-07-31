'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button, Card, EmptyState, Field, Input, Spinner, useNotify } from '@/components/ui';
import { describeError } from '@/lib/api';
import { useOrganization, useUpdateOrganization } from './api';

interface OrganizationForm {
  name: string;
  legalName: string;
  logoUrl: string;
  timezone: string;
}

export function OrganizationView() {
  const t = useTranslations('admin.organization');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  const { data: organization, error, isPending } = useOrganization();
  const update = useUpdateOrganization();
  const notify = useNotify();

  const [form, setForm] = useState<OrganizationForm | null>(null);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  if (error || !organization) {
    return <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />;
  }

  // Seeded from the response on first render, then owned by the form.
  const values: OrganizationForm = form ?? {
    name: organization.name,
    legalName: organization.legalName ?? '',
    logoUrl: organization.logoUrl ?? '',
    timezone: organization.timezone,
  };

  const set = <K extends keyof OrganizationForm>(key: K, value: string) =>
    setForm({ ...values, [key]: value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await update.mutateAsync({
        name: values.name.trim(),
        legalName: values.legalName.trim(),
        timezone: values.timezone.trim(),
        ...(values.logoUrl.trim() ? { logoUrl: values.logoUrl.trim() } : {}),
      });
      notify('success', t('savedTitle'), t('savedDescription'));
    } catch (cause) {
      notify('error', t('saveFailed'), describeError(cause, tStates('tryAgain')));
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-contrast/60">{t('subtitle')}</p>
      </header>

      <Card className="max-w-2xl">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <Field label={t('name')} hint={t('nameHint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                required
                minLength={2}
                aria-describedby={describedBy}
                value={values.name}
                onChange={(event) => set('name', event.target.value)}
              />
            )}
          </Field>

          <Field label={t('legalName')} hint={t('legalNameHint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={values.legalName}
                onChange={(event) => set('legalName', event.target.value)}
              />
            )}
          </Field>

          <Field label={t('logoUrl')} hint={t('logoUrlHint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="url"
                aria-describedby={describedBy}
                value={values.logoUrl}
                onChange={(event) => set('logoUrl', event.target.value)}
                placeholder="https://..."
              />
            )}
          </Field>

          <Field label={t('timezone')} hint={t('timezoneHint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                required
                aria-describedby={describedBy}
                value={values.timezone}
                onChange={(event) => set('timezone', event.target.value)}
              />
            )}
          </Field>

          <dl className="grid gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-contrast/60">
                {t('slug')}
              </dt>
              <dd className="font-mono text-sm text-contrast/80">{organization.slug}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-contrast/60">
                {t('created')}
              </dt>
              <dd className="text-sm text-contrast/80">
                {format.dateTime(new Date(organization.createdAt), 'long')}
              </dd>
            </div>
          </dl>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={form === null || update.isPending}
              onClick={() => setForm(null)}
            >
              {t('reset')}
            </Button>
            <Button type="submit" size="lg" isLoading={update.isPending}>
              {tActions('save')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
