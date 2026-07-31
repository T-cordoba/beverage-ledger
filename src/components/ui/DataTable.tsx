import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

/**
 * Ghost rows shown while a page loads.
 *
 * Enough to fill the space a short page occupies, so the table does not grow
 * from one line to twenty and shove everything below it down the screen.
 */
const SKELETON_ROWS = 5;

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Numbers read better right-aligned: the digits line up down the column. */
  align?: 'start' | 'end';
  /** Secondary detail a phone has no room for. */
  hideBelow?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Describes the table to a screen reader, which sees no surrounding heading. */
  caption: string;
  isLoading?: boolean;
  loadingLabel?: string;
  empty?: ReactNode;
  className?: string;
}

const hideClasses = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;

/**
 * A real `<table>`, not a grid of divs: these are records with shared columns,
 * and the semantics are what let a screen reader announce a cell with its header.
 *
 * The horizontal scroll lives on the wrapper so a wide table scrolls inside its
 * own box instead of pushing the whole page sideways.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  isLoading = false,
  loadingLabel,
  empty,
  className,
}: DataTableProps<T>) {
  const t = useTranslations('common.states');

  if (rows.length === 0 && !isLoading) {
    return <>{empty ?? <EmptyState title={t('nothingToShow')} />}</>;
  }

  return (
    <div
      className={cn('overflow-x-auto', className)}
      role={isLoading ? 'status' : undefined}
      aria-busy={isLoading || undefined}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{isLoading ? (loadingLabel ?? caption) : caption}</caption>
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-3 text-xs font-medium uppercase tracking-wider text-contrast/60',
                  column.align === 'end' ? 'text-right' : 'text-left',
                  column.hideBelow && hideClasses[column.hideBelow],
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={`skeleton-${index}`} className="border-b border-border/20 last:border-b-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-3 py-3', column.hideBelow && hideClasses[column.hideBelow])}
                  >
                    <Skeleton className="h-4" />
                  </td>
                ))}
              </tr>
            ))}

          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border/20 transition-colors last:border-b-0 hover:bg-contrast/5"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-3 py-3 text-foreground',
                    column.align === 'end' ? 'text-right' : 'text-left',
                    column.hideBelow && hideClasses[column.hideBelow],
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
