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
import { useCreateUser, useUpdateUser } from './api';
import { ASSIGNABLE_ROLES, ASSIGNABLE_STATUSES } from './roles';

/**
 * Creates or edits a member. Role and status are locked on your own account: the
 * API refuses those two edits so an administrator cannot lock themselves out,
 * and a disabled control says so before the request does.
 */
export function UserFormDialog({
  user,
  isSelf,
  open,
  onOpenChange,
}: {
  user: User | null;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.users.form');
  const tRoles = useTranslations('admin.roles');
  const tRoleDescriptions = useTranslations('admin.roleDescriptions');
  const tStatuses = useTranslations('admin.statuses');
  const tCommon = useTranslations('common');
  const tActions = useTranslations('common.actions');

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'OPERATOR');
  const [status, setStatus] = useState<UserStatus>(user?.status ?? 'ACTIVE');
  const [password, setPassword] = useState('');

  const create = useCreateUser();
  const update = useUpdateUser();
  const notify = useNotify();

  const isEditing = user !== null;
  const isSaving = create.isPending || update.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();

    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          input: {
            name: trimmedName,
            ...(isSelf ? {} : { role, status }),
          },
        });
        notify('success', t('savedTitle'), t('savedDescription', { name: trimmedName }));
      } else {
        await create.mutateAsync({
          email: email.trim(),
          name: trimmedName,
          role,
          password: password.trim(),
        });
        notify('success', t('createdTitle'), t('createdDescription', { name: trimmedName }));
      }

      onOpenChange(false);
    } catch (error) {
      notify(
        'error',
        isEditing ? t('saveFailed') : t('createFailed'),
        describeError(error, tCommon('states.tryAgain')),
      );
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
          <DialogTitle>
            {isEditing ? t('editTitle', { name: user.name }) : t('createTitle')}
          </DialogTitle>
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

          {!isEditing && (
            <>
              <Field label={t('email')}>
                {({ id }) => (
                  <Input
                    id={id}
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                )}
              </Field>

              <Field
                label={t('password')}
                hint={`${tCommon('passwordPolicy')} ${t('passwordHandover')}`}
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    aria-describedby={describedBy}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                )}
              </Field>
            </>
          )}

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

          {isEditing && (
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
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" size="lg" className="flex-1" isLoading={isSaving}>
              {isEditing ? tActions('save') : t('add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
