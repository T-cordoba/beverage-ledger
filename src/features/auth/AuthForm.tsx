'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Field, Input, PasswordInput } from '@/components/ui';
import { GOOGLE_SIGN_IN_URL, IS_GOOGLE_SIGN_IN_ENABLED } from '@/config/api';
import { RETURN_TO_PARAM, safeReturnTo } from '@/config/navigation';
import { describeError } from '@/lib/api';
import { useAuth } from './auth-context';

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
    >
      {message}
    </p>
  );
}

function GoogleButton({ label }: { label: string }) {
  const t = useTranslations('auth.google');

  if (!IS_GOOGLE_SIGN_IN_ENABLED) return null;

  return (
    <>
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-contrast/40">
        <span className="h-px flex-1 bg-border" />
        {t('separator')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="secondary" size="lg" className="w-full" asChild>
        {/* A plain anchor: this leaves the SPA for the API's OAuth redirect. */}
        <a href={GOOGLE_SIGN_IN_URL}>{label}</a>
      </Button>
    </>
  );
}

export function LoginForm() {
  const t = useTranslations('auth');
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      router.replace(safeReturnTo(searchParams.get(RETURN_TO_PARAM)));
    } catch (cause) {
      setError(describeError(cause, t('signIn.failed')));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}

      <Field label={t('fields.email')}>
        {({ id }) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
      </Field>

      <Field label={t('fields.password')}>
        {({ id }) => (
          <PasswordInput
            id={id}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
        {t('signIn.submit')}
      </Button>

      <GoogleButton label={t('google.signIn')} />

      {/* No sign-up link: an account comes from an invitation an admin sends. */}
      <p className="text-center text-sm text-contrast/60">{t('signIn.byInvitation')}</p>
    </form>
  );
}
