'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  EmptyState,
  Field,
  FloatingAction,
  FormAlert,
  Input,
  RefreshButton,
  Skeleton,
  useNotify,
  type DataTableColumn,
} from '@/components/ui';
import { describeError, type Location } from '@/lib/api';
import { rules, useFormValidation } from '@/lib/forms';
import { useManualRefresh } from '@/lib/hooks';
import { useCreateLocation, useDeleteLocation, useLocations, useUpdateLocation } from './api';

function LocationFormDialog({
  location,
  isSaving,
  open,
  onOpenChange,
  onSubmit,
}: {
  location: Location | null;
  isSaving: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { name: string; isDefault: boolean }) => Promise<void>;
}) {
  const t = useTranslations('locations.form');
  const tActions = useTranslations('common.actions');
  const [name, setName] = useState(location?.name ?? '');
  const [isDefault, setIsDefault] = useState(location?.isDefault ?? false);

  const validation = useFormValidation({
    name: rules.text(name, { minLength: 2 }),
  });

  const submit = async () => {
    await onSubmit({ name: name.trim(), isDefault });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          ref={validation.ref}
          noValidate
          onSubmit={validation.onSubmit(() => void submit())}
          className="space-y-4 text-left"
        >
          <DialogTitle>
            {location ? t('editTitle', { name: location.name }) : t('createTitle')}
          </DialogTitle>

          <DialogDescription>{t('description')}</DialogDescription>

          {validation.alert && <FormAlert title={validation.alert} />}

          <Field label={t('name')} error={validation.errorFor('name')}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => validation.touch('name')}
              />
            )}
          </Field>

          {/* Already the default: there is nothing to offer, since it is replaced
              by promoting another and never by clearing this one. */}
          {!location?.isDefault && (
            <label className="flex items-start gap-3 text-sm text-contrast/80">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
                className="mt-1 h-4 w-4 accent-accent"
              />
              <span>
                {t('makeDefault')}
                <span className="block text-xs text-contrast/50">{t('makeDefaultHint')}</span>
              </span>
            </label>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="sm:flex-1"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              {tActions('cancel')}
            </Button>

            <Button type="submit" size="lg" className="sm:flex-1" isLoading={isSaving}>
              {location ? tActions('save') : tActions('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LocationNameCell({ location }: { location: Location }) {
  const t = useTranslations('locations');

  return (
    <span className="flex items-center gap-2">
      <span className="font-medium text-foreground">{location.name}</span>
      {location.isDefault && <Badge tone="info">{t('default')}</Badge>}
    </span>
  );
}

function LocationMovementCountCell({ location }: { location: Location }) {
  const format = useFormatter();

  return <span className="text-contrast/70">{format.number(location.movementCount)}</span>;
}

function LocationActionsCell({
  location,
  isSaving,
  onPromote,
  onOpenForm,
  onDelete,
}: {
  location: Location;
  isSaving: boolean;
  onPromote: (location: Location) => Promise<void>;
  onOpenForm: (location: Location) => void;
  onDelete: (location: Location) => void;
}) {
  const t = useTranslations('locations');
  const tActions = useTranslations('common.actions');

  let deleteBlockedReason: string | undefined;

  if (location.isDefault) {
    deleteBlockedReason = t('delete.blockedDefault');
  } else if (location.movementCount > 0) {
    deleteBlockedReason = t('delete.blockedInUse', {
      count: location.movementCount,
    });
  }

  return (
    <div className="flex justify-end gap-2">
      {!location.isDefault && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => void onPromote(location)}
        >
          {t('makeDefault')}
        </Button>
      )}

      <Button variant="secondary" size="sm" onClick={() => onOpenForm(location)}>
        {t('rename')}
      </Button>

      <Button
        variant="danger-outline"
        size="sm"
        disabled={location.isDefault || location.movementCount > 0}
        title={deleteBlockedReason}
        onClick={() => onDelete(location)}
      >
        {tActions('delete')}
      </Button>
    </div>
  );
}

function createLocationColumns({
  t,
  isSaving,
  onPromote,
  onOpenForm,
  onDelete,
}: {
  // Headers still come from the message catalogue: the factory sits outside the
  // component, so the translator has to be handed to it rather than hooked.
  t: ReturnType<typeof useTranslations>;
  isSaving: boolean;
  onPromote: (location: Location) => Promise<void>;
  onOpenForm: (location: Location) => void;
  onDelete: (location: Location) => void;
}): DataTableColumn<Location>[] {
  return [
    {
      key: 'name',
      header: t('columns.name'),
      primary: true,
      skeleton: <Skeleton className="h-6 w-40" />,
      cell: (location) => <LocationNameCell location={location} />,
    },
    {
      key: 'movementCount',
      header: t('columns.movementCount'),
      align: 'end',
      summary: true,
      skeleton: <Skeleton className="ml-auto h-5 w-10" />,
      cell: (location) => <LocationMovementCountCell location={location} />,
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      bare: true,
      // Three buttons, and they are what set this row's height.
      skeleton: (
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      ),
      cell: (location) => (
        <LocationActionsCell
          location={location}
          isSaving={isSaving}
          onPromote={onPromote}
          onOpenForm={onOpenForm}
          onDelete={onDelete}
        />
      ),
    },
  ];
}

export function LocationsView() {
  const t = useTranslations('locations');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');

  const { data, isPending, isError, refetch } = useLocations();
  const { refresh, isRefreshing } = useManualRefresh(refetch);
  const create = useCreateLocation();
  const update = useUpdateLocation();
  const remove = useDeleteLocation();
  const notify = useNotify();

  const [editing, setEditing] = useState<Location | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Location | null>(null);

  const isSaving = create.isPending || update.isPending || remove.isPending;
  const locations = data?.data ?? [];

  const openForm = (location: Location | null) => {
    setEditing(location);
    setIsFormOpen(true);
  };

  const save = async (values: { name: string; isDefault: boolean }) => {
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          input: {
            name: values.name,
            ...(values.isDefault ? { isDefault: true } : {}),
          },
        });

        notify('success', t('notify.saved'), t('notify.savedDescription', { name: values.name }));
      } else {
        await create.mutateAsync({
          name: values.name,
          isDefault: values.isDefault,
        });

        notify(
          'success',
          t('notify.created'),
          t('notify.createdDescription', { name: values.name }),
        );
      }

      setIsFormOpen(false);
    } catch (error) {
      notify('error', t('notify.saveFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  const destroy = async (location: Location) => {
    try {
      await remove.mutateAsync(location.id);

      notify(
        'success',
        t('notify.deleted'),
        t('notify.deletedDescription', { name: location.name }),
      );
    } catch (error) {
      notify('error', t('notify.deleteFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  const promote = async (location: Location) => {
    try {
      await update.mutateAsync({
        id: location.id,
        input: { isDefault: true },
      });

      notify(
        'success',
        t('notify.defaultChanged'),
        t('notify.defaultChangedDescription', { name: location.name }),
      );
    } catch (error) {
      notify('error', t('notify.defaultChangeFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  const columns = createLocationColumns({
    t,
    isSaving,
    onPromote: promote,
    onOpenForm: openForm,
    onDelete: setDeleting,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>

          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} />

          <Button size="lg" className="hidden sm:inline-flex" onClick={() => openForm(null)}>
            {t('new')}
          </Button>
        </div>
      </header>

      <FloatingAction
        label={t('new')}
        items={[{ label: t('new'), onClick: () => openForm(null) }]}
      />

      {isError ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={locations}
            rowKey={(location) => location.id}
            isLoading={isPending || isRefreshing}
            loadingLabel={t('loading')}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={t('empty')} />}
          />
        </Card>
      )}

      {/* Keyed so the dialog seeds itself from whichever row is being edited. */}
      <LocationFormDialog
        key={editing?.id ?? 'new'}
        location={editing}
        isSaving={isSaving}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="danger"
        title={t('delete.title', { name: deleting?.name ?? '' })}
        description={t('delete.description')}
        cancelLabel={tActions('cancel')}
        confirmLabel={tActions('delete')}
        isConfirming={remove.isPending}
        onConfirm={() => {
          const location = deleting;
          setDeleting(null);

          if (location) void destroy(location);
        }}
      />
    </div>
  );
}
