'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { GOOGLE_SIGN_IN_URL, IS_GOOGLE_SIGN_IN_ENABLED } from '@/config/api';
import { RETURN_TO_PARAM, ROUTES, safeReturnTo } from '@/config/navigation';
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
  if (!IS_GOOGLE_SIGN_IN_ENABLED) return null;

  return (
    <>
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-contrast/40">
        <span className="h-px flex-1 bg-border" />
        or
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
      setError(describeError(cause, 'Could not sign in. Please try again.'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}

      <Field label="Email">
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

      <Field label="Password">
        {({ id }) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
        Sign in
      </Button>

      <GoogleButton label="Continue with Google" />

      <p className="text-center text-sm text-contrast/60">
        No account yet?{' '}
        <Link href={ROUTES.signUp} className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({ name, email, password });
      router.replace(ROUTES.dashboard);
    } catch (cause) {
      setError(describeError(cause, 'Could not create the account. Please try again.'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}

      <Field label="Name">
        {({ id }) => (
          <Input
            id={id}
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>

      <Field label="Email">
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

      <Field label="Password" hint="At least 12 characters, with lowercase, uppercase and a digit.">
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            required
            aria-describedby={describedBy}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
        Create account
      </Button>

      <GoogleButton label="Sign up with Google" />

      <p className="text-center text-sm text-contrast/60">
        Already registered?{' '}
        <Link href={ROUTES.signIn} className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
