'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Field, FormAlert, Input, PasswordInput, Spinner } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { describeError, storeSession } from '@/lib/api';
import { rules, useFormValidation } from '@/lib/forms';
import { useAcceptInvitation, useInvitationPreview } from './api';

/**
 * Mirrors the policy the API enforces, which is the authority: this only spares
 * the user a round trip. The sentence lives in `common.passwordPolicy`.
 */
const MIN_PASSWORD_LENGTH = 12;

export function AcceptInviteForm({ token }: { token: string }) {
  const t = useTranslations('invite');
  const tCommon = useTranslations('common');
  const tRoles = useTranslations('admin.roles');
  const router = useRouter();

  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const form = useFormValidation({
    name: rules.text(name, { minLength: 2 }),
    password: rules.secret(password, { minLength: MIN_PASSWORD_LENGTH }),
  });

  const submit = async () => {
    setError(null);

    try {
      // Accepting returns a session exactly as a sign-in does, so the new member
      // lands inside instead of being asked to type the password again.
      storeSession(await accept.mutateAsync({ token, name: name.trim(), password }));
      router.replace(ROUTES.dashboard);
    } catch (cause) {
      setError(describeError(cause, t('failed')));
    }
  };

  if (preview.isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <Card className="space-y-4 text-center">
        <h1 className="text-xl font-light text-foreground">{t('invalidTitle')}</h1>
        <p className="text-sm text-contrast/60">
          {describeError(preview.error, t('invalidDescription'))}
        </p>
        <Button variant="secondary" size="lg" className="w-full" asChild>
          <Link href={ROUTES.signIn}>{t('backToSignIn')}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-light text-foreground">
          {t('title', { organization: preview.data.organizationName })}
        </h1>
        <p className="text-sm text-contrast/60">
          {t('subtitle', { email: preview.data.email, role: tRoles(preview.data.role) })}
        </p>
      </div>

      <form
        ref={form.ref}
        noValidate
        onSubmit={form.onSubmit(() => void submit())}
        className="space-y-5"
      >
        {error && <FormAlert title={error} />}
        {form.alert && <FormAlert title={form.alert} />}

        <Field label={t('name')} error={form.errorFor('name')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              required
              autoComplete="name"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => form.touch('name')}
            />
          )}
        </Field>

        <Field
          label={t('password')}
          hint={tCommon('passwordPolicy')}
          error={form.errorFor('password')}
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              required
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => form.touch('password')}
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" isLoading={accept.isPending}>
          {t('submit')}
        </Button>
      </form>
    </Card>
  );
}
