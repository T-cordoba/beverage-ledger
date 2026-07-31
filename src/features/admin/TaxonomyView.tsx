'use client';

import { useFormatter, useTranslations } from 'next-intl';
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

/**
 * The wording, resolved by the caller.
 *
 * A single `noun` would be cheaper, but only in a language where a phrase can be
 * assembled around one: "no categories yet" and "no hay categorías todavía"
 * agree differently, and the noun's gender decides the article. So each view
 * hands over sentences it translated itself.
 */
export interface TaxonomyCopy {
  title: string;
  subtitle: string;
  newItem: string;
  loadFailed: string;
  loading: string;
  empty: string;
  createTitle: string;
  editTitle: (name: string) => string;
  formDescription: string;
  deleteTitle: (name: string) => string;
  deleteDescription: string;
  blockedInUse: (count: number) => string;
}

interface TaxonomyViewProps {
  copy: TaxonomyCopy;
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
  copy,
  withSortOrder,
  isSaving,
  open,
  onOpenChange,
  onSubmit,
}: {
  item: TaxonomyItem | null;
  copy: TaxonomyCopy;
  withSortOrder: boolean;
  isSaving: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaxonomyValues) => Promise<void>;
}) {
  const t = useTranslations('admin.taxonomy');
  const tActions = useTranslations('common.actions');
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
          <DialogTitle>{item ? copy.editTitle(item.name) : copy.createTitle}</DialogTitle>
          <DialogDescription>{copy.formDescription}</DialogDescription>

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

          {withSortOrder && (
            <Field label={t('sortOrder')} hint={t('sortOrderHint')}>
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
              {tActions('cancel')}
            </Button>
            <Button type="submit" size="lg" className="flex-1" isLoading={isSaving}>
              {item ? tActions('save') : tActions('create')}
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
  copy,
  items,
  isPending,
  isError,
  isSaving,
  withSortOrder = false,
  onCreate,
  onUpdate,
  onDelete,
}: TaxonomyViewProps) {
  const t = useTranslations('admin.taxonomy');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();

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
      header: t('columns.name'),
      cell: (item) => <span className="font-medium text-foreground">{item.name}</span>,
    },
    ...(withSortOrder
      ? [
          {
            key: 'sortOrder',
            header: t('columns.sortOrder'),
            align: 'end',
            hideBelow: 'sm',
            cell: (item) => (
              <span className="text-contrast/70">{format.number(item.sortOrder ?? 0)}</span>
            ),
          } satisfies DataTableColumn<TaxonomyItem>,
        ]
      : []),
    {
      key: 'productCount',
      header: t('columns.productCount'),
      align: 'end',
      cell: (item) => <span className="text-contrast/70">{format.number(item.productCount)}</span>,
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => openForm(item)}>
            {t('rename')}
          </Button>
          <Button
            variant="danger-outline"
            size="sm"
            disabled={item.productCount > 0}
            title={item.productCount > 0 ? copy.blockedInUse(item.productCount) : undefined}
            onClick={() => setDeleting(item)}
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
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{copy.title}</h1>
          <p className="text-sm text-contrast/60">{copy.subtitle}</p>
        </div>
        <Button size="lg" onClick={() => openForm(null)}>
          {copy.newItem}
        </Button>
      </header>

      {isError ? (
        <EmptyState title={copy.loadFailed} description={tStates('apiUnreachable')} />
      ) : (
        <Card className="p-0 sm:p-0">
          <DataTable
            caption={copy.title}
            columns={columns}
            rows={items}
            rowKey={(item) => item.id}
            isLoading={isPending}
            loadingLabel={copy.loading}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={copy.empty} />}
          />
        </Card>
      )}

      {/* Keyed so the dialog seeds itself from whichever row is being renamed. */}
      <TaxonomyFormDialog
        key={editing?.id ?? 'new'}
        item={editing}
        copy={copy}
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
        title={copy.deleteTitle(deleting?.name ?? '')}
        description={copy.deleteDescription}
        cancelLabel={tActions('cancel')}
        confirmLabel={tActions('delete')}
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
