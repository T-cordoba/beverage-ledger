'use client';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
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
  FloatingAction,
  FormAlert,
  Input,
  Pagination,
  RefreshButton,
  Skeleton,
  type DataTableColumn,
} from '@/components/ui';
import { rules, useFormValidation } from '@/lib/forms';
import { usePagination } from '@/lib/hooks';

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
  isRefreshing: boolean;
  withSortOrder?: boolean;
  onRefresh: () => void;
  onCreate: (values: TaxonomyValues) => Promise<void>;
  onUpdate: (id: string, values: TaxonomyValues) => Promise<void>;
  onDelete: (item: TaxonomyItem) => Promise<void>;
}

// --- Field inputs, extracted so the `Field` render-prop children are plain
// references to outside components instead of inline function bodies. ---

function NameFieldInput({
  id,
  describedBy,
  invalid,
  value,
  onChange,
  onBlur,
}: Readonly<{
  id: string;
  describedBy?: string;
  invalid?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}>) {
  return (
    <Input
      id={id}
      required
      aria-describedby={describedBy}
      aria-invalid={invalid}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}

function SortOrderFieldInput({
  id,
  describedBy,
  invalid,
  value,
  onChange,
  onBlur,
}: Readonly<{
  id: string;
  describedBy?: string;
  invalid?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}>) {
  return (
    <Input
      id={id}
      type="number"
      min={0}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}

/** Shape `Field` hands back to its `children` render prop. */
type FieldRenderProps = { id: string; describedBy?: string; invalid?: boolean };

// --- Factories that build the `Field` render-prop callback. Declaring the
// returned function here — outside TaxonomyFormDialog — is what satisfies the
// "no nested components" rule: the JSX-returning function is no longer
// lexically defined inside another component's body, only invoked from one. ---

function createNameFieldRenderer(
  value: string,
  onChange: (value: string) => void,
  onBlur: () => void,
) {
  return function NameFieldRenderer({ id, describedBy, invalid }: Readonly<FieldRenderProps>) {
    return (
      <NameFieldInput
        id={id}
        describedBy={describedBy}
        invalid={invalid}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  };
}

function createSortOrderFieldRenderer(
  value: string,
  onChange: (value: string) => void,
  onBlur: () => void,
) {
  return function SortOrderFieldRenderer({ id, describedBy, invalid }: Readonly<FieldRenderProps>) {
    return (
      <SortOrderFieldInput
        id={id}
        describedBy={describedBy}
        invalid={invalid}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  };
}

function TaxonomyFormDialog({
  item,
  copy,
  withSortOrder,
  isSaving,
  open,
  onOpenChange,
  onSubmit,
}: Readonly<{
  item: TaxonomyItem | null;
  copy: TaxonomyCopy;
  withSortOrder: boolean;
  isSaving: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaxonomyValues) => Promise<void>;
}>) {
  const t = useTranslations('admin.taxonomy');
  const tActions = useTranslations('common.actions');
  const [name, setName] = useState(item?.name ?? '');
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const validation = useFormValidation({
    name: rules.text(name, { minLength: 2 }),
    sortOrder: withSortOrder
      ? rules.numeric(sortOrder, { optional: false, min: 0, integer: true })
      : undefined,
  });
  const submit = async () => {
    await onSubmit({ name: name.trim(), sortOrder: Number(sortOrder) || 0 });
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
          <DialogTitle>{item ? copy.editTitle(item.name) : copy.createTitle}</DialogTitle>
          <DialogDescription>{copy.formDescription}</DialogDescription>
          {validation.alert && <FormAlert title={validation.alert} />}
          <Field label={t('name')} error={validation.errorFor('name')}>
            {createNameFieldRenderer(name, setName, () => validation.touch('name'))}
          </Field>
          {withSortOrder && (
            <Field
              label={t('sortOrder')}
              hint={t('sortOrderHint')}
              error={validation.errorFor('sortOrder')}
            >
              {createSortOrderFieldRenderer(sortOrder, setSortOrder, () =>
                validation.touch('sortOrder'),
              )}
            </Field>
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
              {item ? tActions('save') : tActions('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Table cell renderers, extracted so they aren't recreated (and re-detected
// as nested components) on every TaxonomyView render. Each takes only what it needs. ---

function NameCell({ name }: Readonly<{ name: string }>) {
  return <span className="font-medium text-foreground">{name}</span>;
}

function SortOrderCell({
  value,
  format,
}: Readonly<{ value: number; format: ReturnType<typeof useFormatter> }>) {
  return <span className="text-contrast/70">{format.number(value)}</span>;
}

function ProductCountCell({
  value,
  format,
}: Readonly<{ value: number; format: ReturnType<typeof useFormatter> }>) {
  return <span className="text-contrast/70">{format.number(value)}</span>;
}

function ActionsCell({
  item,
  copy,
  t,
  tActions,
  onRename,
  onDeleteRequest,
}: Readonly<{
  item: TaxonomyItem;
  copy: TaxonomyCopy;
  t: ReturnType<typeof useTranslations>;
  tActions: ReturnType<typeof useTranslations>;
  onRename: (item: TaxonomyItem) => void;
  onDeleteRequest: (item: TaxonomyItem) => void;
}>) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={() => onRename(item)}>
        {t('rename')}
      </Button>
      <Button
        variant="danger-outline"
        size="sm"
        disabled={item.productCount > 0}
        title={item.productCount > 0 ? copy.blockedInUse(item.productCount) : undefined}
        onClick={() => onDeleteRequest(item)}
      >
        {tActions('delete')}
      </Button>
    </div>
  );
}

// --- Column factories. Each returns a DataTableColumn whose `cell` closure is
// declared here — outside TaxonomyView — for the same reason as the Field
// renderers above: a JSX-returning function must not be lexically defined
// inside the component that uses it. ---

function buildNameColumn(t: ReturnType<typeof useTranslations>): DataTableColumn<TaxonomyItem> {
  return {
    key: 'name',
    header: t('columns.name'),
    primary: true,
    skeleton: <Skeleton className="h-5 w-40" />,
    cell: (item) => <NameCell name={item.name} />,
  };
}

function buildSortOrderColumn(
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): DataTableColumn<TaxonomyItem> {
  return {
    key: 'sortOrder',
    header: t('columns.sortOrder'),
    align: 'end',
    hideBelow: 'sm',
    skeleton: <Skeleton className="ml-auto h-5 w-8" />,
    cell: (item) => <SortOrderCell value={item.sortOrder ?? 0} format={format} />,
  };
}

function buildProductCountColumn(
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
): DataTableColumn<TaxonomyItem> {
  return {
    key: 'productCount',
    header: t('columns.productCount'),
    align: 'end',
    summary: true,
    skeleton: <Skeleton className="ml-auto h-5 w-8" />,
    cell: (item) => <ProductCountCell value={item.productCount} format={format} />,
  };
}

function buildActionsColumn(
  t: ReturnType<typeof useTranslations>,
  tActions: ReturnType<typeof useTranslations>,
  copy: TaxonomyCopy,
  onRename: (item: TaxonomyItem) => void,
  onDeleteRequest: (item: TaxonomyItem) => void,
): DataTableColumn<TaxonomyItem> {
  return {
    key: 'actions',
    header: t('columns.actions'),
    align: 'end',
    bare: true,
    // Two buttons, and they are what set this row's height.
    skeleton: (
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    ),
    cell: (item) => (
      <ActionsCell
        item={item}
        copy={copy}
        t={t}
        tActions={tActions}
        onRename={onRename}
        onDeleteRequest={onDeleteRequest}
      />
    ),
  };
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
  isRefreshing,
  withSortOrder = false,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: Readonly<TaxonomyViewProps>) {
  const t = useTranslations('admin.taxonomy');
  const tStates = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const format = useFormatter();
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<TaxonomyItem | null>(null);
  // Paged in the browser, unlike every other list. These same rows also fill the
  // catalogue's dropdowns, which are only honest holding every option, so they
  // are fetched whole either way; this only decides how many are painted.
  const pagination = usePagination('taxonomy');
  const pageStart = (pagination.page - 1) * pagination.pageSize;
  const visible = items.slice(pageStart, pageStart + pagination.pageSize);

  const openForm = (item: TaxonomyItem | null) => {
    setEditing(item);
    setIsFormOpen(true);
  };

  const columns = useMemo<DataTableColumn<TaxonomyItem>[]>(() => {
    const cols: DataTableColumn<TaxonomyItem>[] = [buildNameColumn(t)];
    if (withSortOrder) {
      cols.push(buildSortOrderColumn(t, format));
    }
    cols.push(
      buildProductCountColumn(t, format),
      buildActionsColumn(t, tActions, copy, openForm, setDeleting),
    );
    return cols;
  }, [t, tActions, format, withSortOrder, copy]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-foreground sm:text-3xl">{copy.title}</h1>
          <p className="text-sm text-contrast/60">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <RefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} />
          <Button size="lg" className="hidden sm:inline-flex" onClick={() => openForm(null)}>
            {copy.newItem}
          </Button>
        </div>
      </header>
      <FloatingAction
        label={copy.newItem}
        items={[{ label: copy.newItem, onClick: () => openForm(null) }]}
      />
      {isError ? (
        <EmptyState title={copy.loadFailed} description={tStates('apiUnreachable')} />
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <DataTable
            caption={copy.title}
            columns={columns}
            rows={visible}
            rowKey={(item) => item.id}
            isLoading={isPending || isRefreshing}
            // The whole list arrives in one request and pages in the browser, so
            // there is no page total to go on yet: a full page is the guess.
            skeletonRows={pagination.pageSize}
            loadingLabel={copy.loading}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={<EmptyState title={copy.empty} />}
          />
        </Card>
      )}
      {!isPending && !isError && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={items.length}
          pageCount={Math.max(1, Math.ceil(items.length / pagination.pageSize))}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
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
