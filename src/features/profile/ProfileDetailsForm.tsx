'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Card, Field, FormAlert, Input, useNotify } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { describeError } from '@/lib/api';
import { rules, useFormValidation } from '@/lib/forms';
import { useUpdateProfile } from './api';

interface DetailsForm {
  name: string;
  avatarUrl: string;
}

export function ProfileDetailsForm() {
  const t = useTranslations('profile.details');
  const tRoles = useTranslations('admin.roles');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');

  const { user } = useAuth();
  const update = useUpdateProfile();
  const notify = useNotify();

  const [form, setForm] = useState<DetailsForm | null>(null);

  const saved: DetailsForm = { name: user?.name ?? '', avatarUrl: user?.avatarUrl ?? '' };
  // Seeded from the session on first render, then owned by the form. Read above
  // the early return below, because the hook under it cannot be.
  const values: DetailsForm = form ?? saved;

  const validation = useFormValidation({
    name: rules.text(values.name, { minLength: 2 }),
    avatarUrl: rules.url(values.avatarUrl),
  });

  if (!user) return null;

  // Compared rather than read off `form !== null`, so typing a change and
  // undoing it disables the button again instead of offering a no-op save.
  const isDirty =
    values.name.trim() !== saved.name.trim() || values.avatarUrl.trim() !== saved.avatarUrl.trim();

  const set = <K extends keyof DetailsForm>(key: K, value: string) =>
    setForm({ ...values, [key]: value });

  const submit = async () => {
    const avatarUrl = values.avatarUrl.trim();

    try {
      await update.mutateAsync({
        name: values.name.trim(),
        // Null clears it; an empty string would fail the URL validation.
        avatarUrl: avatarUrl || null,
      });
      setForm(null);
      notify('success', t('savedTitle'), t('savedDescription'));
    } catch (cause) {
      notify('error', t('saveFailed'), describeError(cause, tStates('tryAgain')));
    }
  };

  return (
    <Card className="max-w-2xl">
      <form
        ref={validation.ref}
        noValidate
        onSubmit={validation.onSubmit(() => void submit())}
        className="space-y-4"
      >
        {validation.alert && <FormAlert title={validation.alert} />}

        <Field label={t('name')} hint={t('nameHint')} error={validation.errorFor('name')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              required
              autoComplete="name"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              onBlur={() => validation.touch('name')}
            />
          )}
        </Field>

        <Field
          label={t('avatarUrl')}
          hint={t('avatarUrlHint')}
          error={validation.errorFor('avatarUrl')}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="url"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.avatarUrl}
              onChange={(event) => set('avatarUrl', event.target.value)}
              onBlur={() => validation.touch('avatarUrl')}
              placeholder="https://..."
            />
          )}
        </Field>

        <dl className="grid gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-contrast/60">
              {t('email')}
            </dt>
            <dd className="truncate text-sm text-contrast/80">{user.email}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-contrast/60">
              {t('role')}
            </dt>
            <dd className="text-sm text-contrast/80">{tRoles(user.role)}</dd>
          </div>
        </dl>
        <p className="text-xs text-contrast/50">{t('immutable')}</p>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={!isDirty || update.isPending}
            onClick={() => setForm(null)}
          >
            {t('reset')}
          </Button>
          <Button type="submit" size="lg" disabled={!isDirty} isLoading={update.isPending}>
            {tActions('save')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
