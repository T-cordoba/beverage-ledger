'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button, Card, Field, PasswordInput, useNotify } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { describeError } from '@/lib/api';
import { useChangePassword } from './api';

/**
 * Mirrors the policy the API enforces, which is the authority: this only spares
 * the user a round trip to be told what a hint could have said upfront. The
 * sentence itself lives in `common.passwordPolicy`, next to the length.
 */
const MIN_PASSWORD_LENGTH = 12;

const EMPTY = { currentPassword: '', newPassword: '', confirmation: '' };

export function ChangePasswordForm() {
  const t = useTranslations('profile.password');
  const tCommon = useTranslations('common');

  const { signOut } = useAuth();
  const change = useChangePassword();
  const notify = useNotify();

  const [values, setValues] = useState(EMPTY);
  const [mismatch, setMismatch] = useState(false);

  const set = <K extends keyof typeof EMPTY>(key: K, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key !== 'currentPassword') setMismatch(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    // A typo here would lock the account out of every session at once, so the
    // confirmation is checked before anything is sent.
    if (values.newPassword !== values.confirmation) {
      setMismatch(true);
      return;
    }

    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setValues(EMPTY);
      notify('success', t('changedTitle'), t('changedDescription'));
      await signOut();
    } catch (cause) {
      notify('error', t('changeFailed'), describeError(cause, tCommon('states.tryAgain')));
    }
  };

  return (
    <Card className="max-w-2xl">
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <Field label={t('current')}>
          {({ id, describedBy }) => (
            <PasswordInput
              id={id}
              required
              autoComplete="current-password"
              aria-describedby={describedBy}
              value={values.currentPassword}
              onChange={(event) => set('currentPassword', event.target.value)}
            />
          )}
        </Field>

        <Field label={t('new')} hint={tCommon('passwordPolicy')}>
          {({ id, describedBy }) => (
            <PasswordInput
              id={id}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              aria-describedby={describedBy}
              value={values.newPassword}
              onChange={(event) => set('newPassword', event.target.value)}
            />
          )}
        </Field>

        <Field label={t('repeat')} error={mismatch ? t('mismatch') : undefined}>
          {({ id, describedBy }) => (
            <PasswordInput
              id={id}
              required
              autoComplete="new-password"
              aria-describedby={describedBy}
              value={values.confirmation}
              onChange={(event) => set('confirmation', event.target.value)}
            />
          )}
        </Field>

        <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-4">
          <p className="text-xs text-contrast/50">{t('warning')}</p>
          <Button type="submit" size="lg" isLoading={change.isPending}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
