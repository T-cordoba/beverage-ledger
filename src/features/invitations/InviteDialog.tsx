'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  FormAlert,
  Input,
  Select,
  useNotify,
} from '@/components/ui';
import { ASSIGNABLE_ROLES } from '@/features/admin';
import { describeError, type UserRole } from '@/lib/api';
import { rules, useFormValidation } from '@/lib/forms';
import { useCreateInvitation } from './api';

/**
 * Issues an invitation and shows the link.
 *
 * The link is shown once and never again: the server keeps only a hash of the
 * token, so there is nothing to show a second time. Losing it means revoking the
 * invitation and issuing another, which the copy says out loud.
 */
export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.invitations.form');
  const tRoles = useTranslations('admin.roles');
  const tRoleDescriptions = useTranslations('admin.roleDescriptions');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const invite = useCreateInvitation();
  const notify = useNotify();

  const close = () => {
    onOpenChange(false);
    // Cleared on the way out rather than on the way in, so the link does not
    // flash away while the dialog is still closing.
    setTimeout(() => {
      setEmail('');
      setRole('OPERATOR');
      setIssuedUrl(null);
      setHasCopied(false);
    }, 200);
  };

  const form = useFormValidation({ email: rules.email(email) });

  const submit = async () => {
    try {
      const issued = await invite.mutateAsync({ email: email.trim(), role });
      setIssuedUrl(issued.acceptUrl);
    } catch (error) {
      notify('error', t('failed'), describeError(error, tStates('tryAgain')));
    }
  };

  const copy = async () => {
    if (!issuedUrl) return;

    try {
      await navigator.clipboard.writeText(issuedUrl);
      setHasCopied(true);
    } catch {
      // Denied clipboard permission, or an insecure origin. The field below is
      // selectable, so there is still a way to take the link.
      notify('error', t('copyFailed'), t('copyFailedDescription'));
    }
  };

  /** Only assignable roles carry a description; a PLATFORM_ADMIN never lands here. */
  const roleHint = ASSIGNABLE_ROLES.includes(role)
    ? tRoleDescriptions(role as 'OPERATOR' | 'MANAGER' | 'ORG_ADMIN')
    : undefined;

  if (issuedUrl) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent>
          <div className="space-y-4 text-left">
            <DialogTitle>{t('issuedTitle')}</DialogTitle>
            <DialogDescription>{t('issuedDescription', { email })}</DialogDescription>

            <Field label={t('link')} hint={t('linkHint')}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  readOnly
                  value={issuedUrl}
                  aria-describedby={describedBy}
                  onFocus={(event) => event.target.select()}
                  className="font-mono text-xs"
                />
              )}
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={close}
              >
                {tActions('close')}
              </Button>
              <Button type="button" size="lg" className="flex-1" onClick={() => void copy()}>
                {hasCopied ? t('copied') : t('copy')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <form
          ref={form.ref}
          noValidate
          onSubmit={form.onSubmit(() => void submit())}
          className="space-y-4 text-left"
        >
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>

          {form.alert && <FormAlert title={form.alert} />}

          <Field label={t('email')} error={form.errorFor('email')}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                required
                autoComplete="off"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => form.touch('email')}
              />
            )}
          </Field>

          <Field label={t('role')} hint={roleHint}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                aria-describedby={describedBy}
                options={ASSIGNABLE_ROLES.map((value) => ({ value, label: tRoles(value) }))}
              />
            )}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={invite.isPending}
              onClick={close}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" size="lg" className="flex-1" isLoading={invite.isPending}>
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
