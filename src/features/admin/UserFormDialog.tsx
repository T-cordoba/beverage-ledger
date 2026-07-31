'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  Input,
  Select,
  useNotify,
} from '@/components/ui';
import { describeError, type User, type UserRole, type UserStatus } from '@/lib/api';
import { useUpdateUser } from './api';
import { ASSIGNABLE_ROLES, ASSIGNABLE_STATUSES } from './roles';

/**
 * Edits an existing member. There is no create side any more: a member gets in
 * by taking up an invitation, which is also what gives them a password nobody
 * else has ever seen.
 *
 * Role and status are locked on your own account. The API refuses those two
 * edits so an administrator cannot lock themselves out, and a disabled control
 * says so before the request does.
 */
export function UserFormDialog({
  user,
  isSelf,
  open,
  onOpenChange,
}: {
  user: User;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.users.form');
  const tRoles = useTranslations('admin.roles');
  const tRoleDescriptions = useTranslations('admin.roleDescriptions');
  const tStatuses = useTranslations('admin.statuses');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');

  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);

  const update = useUpdateUser();
  const notify = useNotify();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();

    try {
      await update.mutateAsync({
        id: user.id,
        input: { name: trimmedName, ...(isSelf ? {} : { role, status }) },
      });
      notify('success', t('savedTitle'), t('savedDescription', { name: trimmedName }));
      onOpenChange(false);
    } catch (error) {
      notify('error', t('saveFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  /** Only assignable roles carry a description; a PLATFORM_ADMIN never lands here. */
  const roleHint = ASSIGNABLE_ROLES.includes(role)
    ? tRoleDescriptions(role as 'OPERATOR' | 'MANAGER' | 'ORG_ADMIN')
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 text-left">
          <DialogTitle>{t('editTitle', { name: user.name })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>

          <Field label={t('name')}>
            {({ id }) => (
              <Input
                id={id}
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>

          <Field label={t('role')} hint={isSelf ? t('roleLockedSelf') : roleHint}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={isSelf}
                aria-describedby={describedBy}
                options={ASSIGNABLE_ROLES.map((value) => ({ value, label: tRoles(value) }))}
              />
            )}
          </Field>

          <Field label={t('status')} hint={isSelf ? t('statusLockedSelf') : t('statusHint')}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                value={status}
                onValueChange={(value) => setStatus(value as UserStatus)}
                disabled={isSelf}
                aria-describedby={describedBy}
                options={ASSIGNABLE_STATUSES.map((value) => ({
                  value,
                  label: tStatuses(value),
                }))}
              />
            )}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={update.isPending}
              onClick={() => onOpenChange(false)}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" size="lg" className="flex-1" isLoading={update.isPending}>
              {tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
