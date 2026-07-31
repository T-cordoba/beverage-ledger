'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
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
  Input,
  useNotify,
  type DataTableColumn,
} from '@/components/ui';
import { describeError, type Location } from '@/lib/api';
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ name: name.trim(), isDefault });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 text-left">
          <DialogTitle>
            {location ? t('editTitle', { name: location.name }) : t('createTitle')}
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
              className="flex-1"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" size="lg" className="flex-1" isLoading={isSaving}>
              {location ? tActions('save') : tActions('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LocationsView() {
  const t = useTranslations('locations');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

  const { data, isPending, isError } = useLocations();
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
          input: { name: values.name, ...(values.isDefault ? { isDefault: true } : {}) },
        });
        notify('success', t('notify.saved'), t('notify.savedDescription', { name: values.name }));
      } else {
        await create.mutateAsync({ name: values.name, isDefault: values.isDefault });
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
      await update.mutateAsync({ id: location.id, input: { isDefault: true } });
      notify(
        'success',
        t('notify.defaultChanged'),
        t('notify.defaultChangedDescription', { name: location.name }),
      );
    } catch (error) {
      notify('error', t('notify.defaultChangeFailed'), describeError(error, tStates('tryAgain')));
    }
  };

  const columns: DataTableColumn<Location>[] = [
    {
      key: 'name',
      header: t('columns.name'),
      cell: (location) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{location.name}</span>
          {location.isDefault && <Badge tone="info">{t('default')}</Badge>}
        </span>
      ),
    },
    {
      key: 'movementCount',
      header: t('columns.movementCount'),
      align: 'end',
      hideBelow: 'sm',
      cell: (location) => (
        <span className="text-contrast/70">{format.number(location.movementCount)}</span>
      ),
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      cell: (location) => (
        <div className="flex justify-end gap-2">
          {!location.isDefault && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isSaving}
              onClick={() => void promote(location)}
            >
              {t('makeDefault')}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => openForm(location)}>
            {t('rename')}
          </Button>
          <Button
            variant="danger-outline"
            size="sm"
            disabled={location.isDefault || location.movementCount > 0}
            title={
              location.isDefault
                ? t('delete.blockedDefault')
                : location.movementCount > 0
                  ? t('delete.blockedInUse', { count: location.movementCount })
                  : undefined
            }
            onClick={() => setDeleting(location)}
          >
            {tActions('delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-contrast/60">{t('subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => openForm(null)}>
          {t('new')}
        </Button>
      </header>

      {isError ? (
        <EmptyState title={t('loadFailed')} description={tStates('apiUnreachable')} />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption={t('caption')}
            columns={columns}
            rows={locations}
            rowKey={(location) => location.id}
            isLoading={isPending}
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
