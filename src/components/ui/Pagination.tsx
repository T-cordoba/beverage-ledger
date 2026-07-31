'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { PAGE_SIZES } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Select } from './Select';

/** First and last are always reachable, plus this many either side of the current page. */
const AROUND_CURRENT = 1;

/**
 * The page numbers to render, with `null` standing for a gap.
 *
 * Every page fits while there are few of them; past that the row would grow
 * without bound, so the middle collapses and the ends stay reachable.
 */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set([1, pageCount]);

  for (let n = page - AROUND_CURRENT; n <= page + AROUND_CURRENT; n++) {
    if (n >= 1 && n <= pageCount) wanted.add(n);
  }

  const result: (number | null)[] = [];
  let previous = 0;

  for (const n of [...wanted].sort((a, b) => a - b)) {
    if (n - previous > 1) result.push(null);
    result.push(n);
    previous = n;
  }

  return result;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  /** Matching items across every page, which is what the reader wants to know. */
  total: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  pageCount,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const t = useTranslations('common.pagination');
  const format = useFormatter();

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={t('label')}
      className={cn(
        'flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row sm:gap-6',
        className,
      )}
    >
      <p className="text-xs text-contrast/60" aria-live="polite">
        {total === 0 ? t('empty') : t('summary', { from, to, total })}
      </p>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-contrast/60">
          {t('pageSize')}
          <Select
            size="sm"
            className="w-20"
            value={String(pageSize)}
            onValueChange={(next) => onPageSizeChange(Number(next))}
            options={PAGE_SIZES.map((size) => ({
              value: String(size),
              label: format.number(size),
            }))}
          />
        </label>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('previous')}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronIcon direction="left" />
          </Button>

          {/* Numbers on a phone would wrap onto their own line for little gain;
              the reader still knows where they are and can step either way. */}
          <span className="text-xs text-contrast/60 sm:hidden">
            {t('current', { page, pageCount })}
          </span>

          <ol className="hidden items-center gap-1 sm:flex">
            {pageWindow(page, pageCount).map((candidate, index) =>
              candidate === null ? (
                <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-contrast/40">
                  …
                </li>
              ) : (
                <li key={candidate}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('goToPage', { page: candidate })}
                    aria-current={candidate === page ? 'page' : undefined}
                    className={
                      candidate === page
                        ? 'bg-accent font-medium text-background hover:bg-accent-hover'
                        : 'text-contrast'
                    }
                    onClick={() => onPageChange(candidate)}
                  >
                    {format.number(candidate)}
                  </Button>
                </li>
              ),
            )}
          </ol>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('next')}
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronIcon direction="right" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
      />
    </svg>
  );
}
