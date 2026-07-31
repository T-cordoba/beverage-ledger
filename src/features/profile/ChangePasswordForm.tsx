'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Card, Field, FormAlert, PasswordInput, useNotify } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { describeError } from '@/lib/api';
import { rules, useFormValidation } from '@/lib/forms';
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

  // A typo would lock the account out of every session at once, so the
  // confirmation has to agree before anything is sent.
  const validation = useFormValidation({
    currentPassword: rules.secret(values.currentPassword),
    newPassword: rules.secret(values.newPassword, { minLength: MIN_PASSWORD_LENGTH }),
    confirmation: rules.matches(values.confirmation, values.newPassword),
  });

  const set = <K extends keyof typeof EMPTY>(key: K, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
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
      <form
        ref={validation.ref}
        noValidate
        onSubmit={validation.onSubmit(() => void submit())}
        className="space-y-4"
      >
        {validation.alert && <FormAlert title={validation.alert} />}

        <Field label={t('current')} error={validation.errorFor('currentPassword')}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              required
              autoComplete="current-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.currentPassword}
              onChange={(event) => set('currentPassword', event.target.value)}
              onBlur={() => validation.touch('currentPassword')}
            />
          )}
        </Field>

        <Field
          label={t('new')}
          hint={tCommon('passwordPolicy')}
          error={validation.errorFor('newPassword')}
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              required
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.newPassword}
              onChange={(event) => set('newPassword', event.target.value)}
              onBlur={() => validation.touch('newPassword')}
            />
          )}
        </Field>

        <Field label={t('repeat')} error={validation.errorFor('confirmation')}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              required
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.confirmation}
              onChange={(event) => set('confirmation', event.target.value)}
              onBlur={() => validation.touch('confirmation')}
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
