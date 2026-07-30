'use client';

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
import { formatNumber, pluralize } from '@/lib/utils';
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
          <DialogTitle>{location ? `Rename ${location.name}` : 'New location'}</DialogTitle>
          <DialogDescription>
            Where stock lives. A movement that names none lands on the default.
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
                Make it the default
                <span className="block text-xs text-contrast/50">
                  The current default is demoted. There is always exactly one.
                </span>
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
              Cancel
            </Button>
            <Button type="submit" size="lg" className="flex-1" isLoading={isSaving}>
              {location ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LocationsView() {
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
        notify('success', 'Location saved', `${values.name} was updated.`);
      } else {
        await create.mutateAsync({ name: values.name, isDefault: values.isDefault });
        notify('success', 'Location created', `${values.name} can receive stock now.`);
      }
      setIsFormOpen(false);
    } catch (error) {
      notify('error', 'Could not save the location', describeError(error, 'Please try again.'));
    }
  };

  const destroy = async (location: Location) => {
    try {
      await remove.mutateAsync(location.id);
      notify('success', 'Location deleted', `${location.name} is gone.`);
    } catch (error) {
      notify('error', 'Could not delete the location', describeError(error, 'Please try again.'));
    }
  };

  const promote = async (location: Location) => {
    try {
      await update.mutateAsync({ id: location.id, input: { isDefault: true } });
      notify('success', 'Default changed', `${location.name} is where movements land now.`);
    } catch (error) {
      notify('error', 'Could not change the default', describeError(error, 'Please try again.'));
    }
  };

  const columns: DataTableColumn<Location>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (location) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{location.name}</span>
          {location.isDefault && <Badge tone="info">Default</Badge>}
        </span>
      ),
    },
    {
      key: 'movementCount',
      header: 'Ledger lines',
      align: 'end',
      hideBelow: 'sm',
      cell: (location) => (
        <span className="text-contrast/70">{formatNumber(location.movementCount)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
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
              Make default
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => openForm(location)}>
            Rename
          </Button>
          <Button
            variant="danger-outline"
            size="sm"
            disabled={location.isDefault || location.movementCount > 0}
            title={
              location.isDefault
                ? 'The default cannot be deleted: promote another one first'
                : location.movementCount > 0
                  ? `${formatNumber(location.movementCount)} ledger ${pluralize(location.movementCount, 'line')} reference it`
                  : undefined
            }
            onClick={() => setDeleting(location)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">Locations</h1>
          <p className="text-sm text-contrast/60">
            Where stock lives. Every level and every ledger line belongs to one, and a transfer
            moves units between two without changing the total.
          </p>
        </div>
        <Button size="lg" onClick={() => openForm(null)}>
          New location
        </Button>
      </header>

      {isError ? (
        <EmptyState
          title="The locations could not be loaded."
          description="Check that the API is reachable and try again."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption="Locations"
            columns={columns}
            rows={locations}
            rowKey={(location) => location.id}
            isLoading={isPending}
            loadingLabel="Loading locations"
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title="No locations yet." />}
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
        title={`Delete ${deleting?.name}?`}
        description="No ledger line references it, so it can go without leaving a gap in the history."
        cancelLabel="Keep it"
        confirmLabel="Delete"
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
