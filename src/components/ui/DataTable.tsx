'use client';

import { useTranslations } from 'next-intl';
import { Fragment, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

/**
 * Ghost rows when the caller does not say how many are coming.
 *
 * A paginated list always knows — it is the page size — and passes it, so this
 * only covers a table that holds everything it has.
 */
const SKELETON_ROWS = 5;

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Numbers read better right-aligned: the digits line up down the column. */
  align?: 'start' | 'end';
  /** Secondary detail a narrow table has no room for. */
  hideBelow?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * Stands in for this cell while a page loads. Default is one line the height
   * of plain cell text; anything taller — a second line under the name, a row of
   * buttons — has to be declared here, or the table resizes when the rows land
   * and that jolt is the whole thing a skeleton exists to avoid.
   */
  skeleton?: ReactNode;
  /** What identifies the row. Kept on a phone. Defaults to the first column. */
  primary?: boolean;
  /** The one figure that keeps the primary column company on a phone. */
  summary?: boolean;
  /**
   * Drawn without its header in the detail panel. For a cell that is already its
   * own label — a row of buttons, a badge that names its own state.
   */
  bare?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Describes the table to a screen reader, which sees no surrounding heading. */
  caption: string;
  isLoading?: boolean;
  loadingLabel?: string;
  /**
   * How many ghost rows to lay out. Pass what the page is about to hold, so the
   * table is already its final height before the rows arrive.
   */
  skeletonRows?: number;
  empty?: ReactNode;
  className?: string;
}

const hideClasses = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;

function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn('h-4 w-4 transition-transform duration-base', isOpen && 'rotate-180')}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

/**
 * A real `<table>`, not a grid of divs: these are records with shared columns,
 * and the semantics are what let a screen reader announce a cell with its header.
 *
 * One table serves both widths rather than a phone layout beside a desktop one.
 * A phone keeps the column that says which record this is and one figure to scan
 * by; everything else moves into a panel the row opens. That is not a way of
 * showing less — the columns marked `hideBelow` were already gone at that width,
 * and in the panel they come back. What it removes is the sideways scrolling,
 * which no fade or shadow makes pleasant to read a record through.
 *
 * The horizontal scroll stays on the wrapper for the widths that still need it.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  isLoading = false,
  loadingLabel,
  skeletonRows = SKELETON_ROWS,
  empty,
  className,
}: DataTableProps<T>) {
  const t = useTranslations('common.states');
  const tActions = useTranslations('common.actions');
  const tableId = useId();
  // A set, not one key: comparing two records side by side is most of what a
  // detail panel is for.
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set());

  const primaryKey = (columns.find((column) => column.primary) ?? columns[0])?.key;
  const isOnPhone = (column: DataTableColumn<T>) =>
    column.key === primaryKey || column.summary === true;

  /**
   * A column that does not survive the narrowest width is hidden from `sm` down
   * whatever else it asked for, and the stricter of the two breakpoints wins —
   * which is what keeps "too narrow for this" and "moved to the panel" from
   * needing two separate conditions at every cell.
   */
  const hiddenAt = (column: DataTableColumn<T>) =>
    isOnPhone(column) ? column.hideBelow : (column.hideBelow ?? 'sm');

  const detailed = columns.filter((column) => !isOnPhone(column));

  const toggle = (key: string) =>
    setOpenRows((open) => {
      const next = new Set(open);

      if (!next.delete(key)) next.add(key);

      return next;
    });

  if (rows.length === 0 && !isLoading) {
    return <>{empty ?? <EmptyState title={t('nothingToShow')} />}</>;
  }

  return (
    <div
      className={cn('overflow-x-auto', className)}
      role={isLoading ? 'status' : undefined}
      aria-busy={isLoading || undefined}
    >
      {/* Fixed layout on a phone, automatic from `sm` up.

          An automatic table takes its column widths from the min-content of the
          cells, and a cell holding an address has no space to break at — one
          `tommy.cormo@gmail.com` asks for 180px and gets it, `truncate` included,
          because truncation cannot shrink a column that sizes itself to its text.
          Two such columns and the table is wider than the screen. Fixed layout
          reverses that: the columns divide what there is, and `truncate` finally
          means what it says. */}
      <table className="w-full table-fixed border-collapse text-sm sm:table-auto">
        <caption className="sr-only">{isLoading ? (loadingLabel ?? caption) : caption}</caption>
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((column) => {
              const hidden = hiddenAt(column);

              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-3 py-3 text-xs font-medium uppercase tracking-wider text-contrast/60',
                    column.align === 'end' ? 'text-right' : 'text-left',
                    hidden && hideClasses[hidden],
                  )}
                >
                  {column.header}
                </th>
              );
            })}

            {/* The disclosure's own column. Titled for a screen reader only: a
                header over a chevron would be a word wider than the control. */}
            {detailed.length > 0 && (
              <th scope="col" className="w-10 px-1 sm:hidden">
                <span className="sr-only">{tActions('showDetails')}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {/* Instead of the rows, never alongside them: with a previous page kept
              on screen while the next one loads, showing both would draw two
              tables' worth of height. */}
          {isLoading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={`skeleton-${index}`} className="border-b border-border/20 last:border-b-0">
                  {columns.map((column) => {
                    const hidden = hiddenAt(column);

                    return (
                      <td
                        key={column.key}
                        className={cn('px-3 py-3', hidden && hideClasses[hidden])}
                      >
                        {column.skeleton ?? <Skeleton className="h-5" />}
                      </td>
                    );
                  })}
                  {detailed.length > 0 && <td className="w-10 px-1 sm:hidden" />}
                </tr>
              ))
            : rows.map((row) => {
                const key = rowKey(row);
                const isOpen = openRows.has(key);
                const detailId = `${tableId}-${key}`;

                return (
                  <Fragment key={key}>
                    <tr
                      className={cn(
                        'border-b border-border/20 transition-colors last:border-b-0 hover:bg-contrast/5',
                        // Without this the panel reads as a row of its own rather
                        // than as the bottom of the one that opened it.
                        isOpen && 'border-b-0 bg-contrast/5',
                      )}
                    >
                      {columns.map((column) => {
                        const hidden = hiddenAt(column);

                        return (
                          <td
                            key={column.key}
                            className={cn(
                              // The safety net under the fixed layout: a word
                              // with nowhere to break is broken rather than left
                              // to spill over the column beside it.
                              'break-words px-3 py-3 text-foreground',
                              column.align === 'end' ? 'text-right' : 'text-left',
                              hidden && hideClasses[hidden],
                              column.className,
                            )}
                          >
                            {column.cell(row)}
                          </td>
                        );
                      })}

                      {detailed.length > 0 && (
                        <td className="w-10 px-1 sm:hidden">
                          {/* A control of its own rather than the whole row: the
                              primary cell of half these tables is a link, and a
                              row that both navigates and expands makes the same
                              pixel mean two things. */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            aria-label={tActions(isOpen ? 'hideDetails' : 'showDetails')}
                            onClick={() => toggle(key)}
                          >
                            <Chevron isOpen={isOpen} />
                          </Button>
                        </td>
                      )}
                    </tr>

                    {isOpen && (
                      <tr className="border-b border-border/20 sm:hidden">
                        <td
                          id={detailId}
                          colSpan={columns.length + 1}
                          className="bg-contrast/5 px-3 pb-3"
                        >
                          <dl className="animate-in space-y-2 fade-in-0 slide-in-from-top-1">
                            {detailed.map((column) =>
                              column.bare ? (
                                <div key={column.key} className="pt-1">
                                  {column.cell(row)}
                                </div>
                              ) : (
                                <div
                                  key={column.key}
                                  className="flex items-baseline justify-between gap-4"
                                >
                                  <dt className="shrink-0 text-xs uppercase tracking-wider text-contrast/50">
                                    {column.header}
                                  </dt>
                                  <dd className="min-w-0 text-right text-foreground">
                                    {column.cell(row)}
                                  </dd>
                                </div>
                              ),
                            )}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
