'use client';

import { useState, type FormEvent } from 'react';
import {
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
  type DataTableColumn,
} from '@/components/ui';
import { formatNumber, pluralize } from '@/lib/utils';

export interface TaxonomyItem {
  id: string;
  name: string;
  productCount: number;
  /** Categories carry a display order; brands do not. */
  sortOrder?: number;
}

export interface TaxonomyValues {
  name: string;
  sortOrder: number;
}

interface TaxonomyViewProps {
  title: string;
  description: string;
  /** Singular, lowercase: used in every confirmation and error message. */
  noun: string;
  items: TaxonomyItem[];
  isPending: boolean;
  isError: boolean;
  isSaving: boolean;
  withSortOrder?: boolean;
  onCreate: (values: TaxonomyValues) => Promise<void>;
  onUpdate: (id: string, values: TaxonomyValues) => Promise<void>;
  onDelete: (item: TaxonomyItem) => Promise<void>;
}

function TaxonomyFormDialog({
  item,
  noun,
  withSortOrder,
  isSaving,
  open,
  onOpenChange,
  onSubmit,
}: {
  item: TaxonomyItem | null;
  noun: string;
  withSortOrder: boolean;
  isSaving: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaxonomyValues) => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ name: name.trim(), sortOrder: Number(sortOrder) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 text-left">
          <DialogTitle>{item ? `Rename ${item.name}` : `New ${noun}`}</DialogTitle>
          <DialogDescription>
            The slug it is unique by is derived from the name, so two {pluralize(2, noun)} cannot
            share one.
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

          {withSortOrder && (
            <Field label="Display order" hint="Ascending. Ties fall back to the name.">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  aria-describedby={describedBy}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
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
              {item ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Categories and brands are the same screen: a name, how many products point at
 * it, and a delete that only goes through while nothing does. Only the display
 * order differs, which is why it is a flag rather than two near-identical views.
 */
export function TaxonomyView({
  title,
  description,
  noun,
  items,
  isPending,
  isError,
  isSaving,
  withSortOrder = false,
  onCreate,
  onUpdate,
  onDelete,
}: TaxonomyViewProps) {
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<TaxonomyItem | null>(null);

  const openForm = (item: TaxonomyItem | null) => {
    setEditing(item);
    setIsFormOpen(true);
  };

  const columns: DataTableColumn<TaxonomyItem>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (item) => <span className="font-medium text-foreground">{item.name}</span>,
    },
    ...(withSortOrder
      ? [
          {
            key: 'sortOrder',
            header: 'Order',
            align: 'end',
            hideBelow: 'sm',
            cell: (item) => (
              <span className="text-contrast/70">{formatNumber(item.sortOrder ?? 0)}</span>
            ),
          } satisfies DataTableColumn<TaxonomyItem>,
        ]
      : []),
    {
      key: 'productCount',
      header: 'Products',
      align: 'end',
      cell: (item) => <span className="text-contrast/70">{formatNumber(item.productCount)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => openForm(item)}>
            Rename
          </Button>
          <Button
            variant="danger-outline"
            size="sm"
            disabled={item.productCount > 0}
            title={
              item.productCount > 0
                ? `${formatNumber(item.productCount)} ${pluralize(item.productCount, 'product')} still reference it`
                : undefined
            }
            onClick={() => setDeleting(item)}
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
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{title}</h1>
          <p className="text-sm text-contrast/60">{description}</p>
        </div>
        <Button size="lg" onClick={() => openForm(null)}>
          New {noun}
        </Button>
      </header>

      {isError ? (
        <EmptyState
          title={`The ${pluralize(2, noun)} could not be loaded.`}
          description="Check that the API is reachable and try again."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption={title}
            columns={columns}
            rows={items}
            rowKey={(item) => item.id}
            isLoading={isPending}
            loadingLabel={`Loading ${pluralize(2, noun)}`}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={`No ${pluralize(2, noun)} yet.`} />}
          />
        </Card>
      )}

      {/* Keyed so the dialog seeds itself from whichever row is being renamed. */}
      <TaxonomyFormDialog
        key={editing?.id ?? 'new'}
        item={editing}
        noun={noun}
        withSortOrder={withSortOrder}
        isSaving={isSaving}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={async (values) => {
          if (editing) {
            await onUpdate(editing.id, values);
          } else {
            await onCreate(values);
          }
          setIsFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="danger"
        title={`Delete ${deleting?.name}?`}
        description={`Nothing references it, so it can go. Products already using a ${noun} keep it.`}
        cancelLabel="Keep it"
        confirmLabel="Delete"
        isConfirming={isSaving}
        onConfirm={() => {
          const item = deleting;
          setDeleting(null);
          if (item) void onDelete(item);
        }}
      />
    </div>
  );
}
