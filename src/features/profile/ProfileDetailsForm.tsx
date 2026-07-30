'use client';

import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Input, useNotify } from '@/components/ui';
import { ROLE_LABELS } from '@/features/admin';
import { useAuth } from '@/features/auth';
import { describeError } from '@/lib/api';
import { useUpdateProfile } from './api';

interface DetailsForm {
  name: string;
  avatarUrl: string;
}

export function ProfileDetailsForm() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const notify = useNotify();

  const [form, setForm] = useState<DetailsForm | null>(null);

  if (!user) return null;

  // Seeded from the session on first render, then owned by the form.
  const values: DetailsForm = form ?? { name: user.name, avatarUrl: user.avatarUrl ?? '' };

  const set = <K extends keyof DetailsForm>(key: K, value: string) =>
    setForm({ ...values, [key]: value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const avatarUrl = values.avatarUrl.trim();

    try {
      await update.mutateAsync({
        name: values.name.trim(),
        // Null clears it; an empty string would fail the URL validation.
        avatarUrl: avatarUrl || null,
      });
      setForm(null);
      notify('success', 'Profile saved', 'Your name is updated everywhere it is shown.');
    } catch (cause) {
      notify('error', 'Could not save the profile', describeError(cause, 'Please try again.'));
    }
  };

  return (
    <Card className="max-w-2xl">
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <Field label="Name" hint="Shown on your movements and in the audit log.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              required
              minLength={2}
              autoComplete="name"
              aria-describedby={describedBy}
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
            />
          )}
        </Field>

        <Field label="Avatar URL" hint="Absolute URL. Empty removes the current one.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="url"
              aria-describedby={describedBy}
              value={values.avatarUrl}
              onChange={(event) => set('avatarUrl', event.target.value)}
              placeholder="https://..."
            />
          )}
        </Field>

        <dl className="grid gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-contrast/60">Email</dt>
            <dd className="truncate text-sm text-contrast/80">{user.email}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-contrast/60">Role</dt>
            <dd className="text-sm text-contrast/80">{ROLE_LABELS[user.role]}</dd>
          </div>
        </dl>
        <p className="text-xs text-contrast/50">
          Neither can be changed here: the email identifies the account, and the role is an
          administrator&rsquo;s call.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={form === null || update.isPending}
            onClick={() => setForm(null)}
          >
            Reset
          </Button>
          <Button type="submit" size="lg" isLoading={update.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}
