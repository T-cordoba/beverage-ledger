'use client';

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

    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          input: {
            name: name.trim(),
            ...(isSelf ? {} : { role, status }),
          },
        });
        notify('success', 'Member saved', `${name.trim()} was updated.`);
      } else {
        await create.mutateAsync({
          email: email.trim(),
          name: name.trim(),
          role,
          password: password.trim(),
        });
        notify('success', 'Member added', `${name.trim()} can sign in now.`);
      }

      onOpenChange(false);
    } catch (error) {
      notify(
        'error',
        isEditing ? 'Could not save the member' : 'Could not add the member',
        describeError(error, 'Please try again.'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 text-left">
          <DialogTitle>{isEditing ? `Edit ${user.name}` : 'New member'}</DialogTitle>
          <DialogDescription>
            Roles come from one declarative matrix in the API. Hiding a button is not the control —
            the API enforces it.
          </DialogDescription>

          <Field label="Name">
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
              <Field label="Email">
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
                label="Password"
                hint="At least 12 characters, with lowercase, uppercase and a digit. Hand it over out of band; they can change it from their profile."
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

          <Field
            label="Role"
            hint={
              isSelf
                ? 'You cannot change your own role.'
                : ASSIGNABLE_ROLES.find((option) => option.value === role)?.description
            }
          >
            {({ id, describedBy }) => (
              <Select
                id={id}
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={isSelf}
                aria-describedby={describedBy}
                options={ASSIGNABLE_ROLES}
              />
            )}
          </Field>

          {isEditing && (
            <Field
              label="Status"
              hint={
                isSelf
                  ? 'You cannot suspend your own account.'
                  : 'Suspending keeps the history and closes the door.'
              }
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  value={status}
                  onValueChange={(value) => setStatus(value as UserStatus)}
                  disabled={isSelf}
                  aria-describedby={describedBy}
                  options={ASSIGNABLE_STATUSES}
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
              Cancel
            </Button>
            <Button type="submit" size="lg" className="flex-1" isLoading={isSaving}>
              {isEditing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
