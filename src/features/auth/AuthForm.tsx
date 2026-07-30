'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Input } from '@/components/ui';
import { GOOGLE_SIGN_IN_URL, IS_GOOGLE_SIGN_IN_ENABLED } from '@/config/api';
import { RETURN_TO_PARAM, ROUTES, safeReturnTo } from '@/config/navigation';
import { describeError } from '@/lib/api';
import { useAuth } from './auth-context';

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wider text-contrast/70"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

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

      <Field id="email" label="Email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field id="password" label="Password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
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
      router.replace(ROUTES.movements);
    } catch (cause) {
      setError(describeError(cause, 'Could not create the account. Please try again.'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}

      <Field id="name" label="Name">
        <Input
          id="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field id="email" label="Email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field id="password" label="Password">
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-xs text-contrast/50">
          At least 12 characters, with lowercase, uppercase and a digit.
        </p>
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
