'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { cn, getMonthNames, getWeekdayNames, parseDateKey, toDateKey } from '@/lib/utils';
import { Button } from './Button';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

interface DatePickerProps {
  /** `YYYY-MM-DD`, or empty for no date. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * What the popover is showing. Paging a month at a time is fine for last week
 * and useless for a movement from two years ago, so the heading zooms out.
 */
type CalendarMode = 'day' | 'month' | 'year';

/** One screen of years. Twelve so the grid matches the month view's shape. */
const YEARS_PER_PAGE = 12;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

export function DatePicker({ value, onChange, placeholder, className }: DatePickerProps) {
  const t = useTranslations('common.datePicker');
  const format = useFormatter();
  const locale = useLocale();
  const weekdayNames = useMemo(() => getWeekdayNames(locale), [locale]);
  const monthNames = useMemo(() => getMonthNames(locale), [locale]);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CalendarMode>('day');

  // The month on screen is separate from the selected day: paging through
  // months used to overwrite the value with the 1st of each month visited.
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(value ? parseDateKey(value) : new Date()),
  );

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setViewMonth(startOfMonth(value ? parseDateKey(value) : new Date()));
      setMode('day');
    }
    setIsOpen(open);
  };

  const shiftMonths = (offset: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = viewMonth.getDay();
  const todayKey = toDateKey(new Date());
  const today = new Date();

  // Paging years moves the view rather than a separate cursor, so selecting one
  // needs no reconciliation: what is on screen is what will be picked.
  const yearPageStart = Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPageStart + index);

  // Years are strings on purpose: as numbers the formatter groups them, and
  // 2026 comes out as "2.026".
  const header = {
    day: {
      title: format.dateTime(viewMonth, 'monthYear'),
      zoomOut: () => setMode('month'),
      zoomOutLabel: t('selectMonth'),
      step: shiftMonths,
      stepBy: 1,
      previousLabel: t('previousMonth'),
      nextLabel: t('nextMonth'),
    },
    month: {
      title: String(year),
      zoomOut: () => setMode('year'),
      zoomOutLabel: t('selectYear'),
      step: shiftMonths,
      stepBy: 12,
      previousLabel: t('previousYear'),
      nextLabel: t('nextYear'),
    },
    year: {
      title: `${yearPageStart}–${yearPageStart + YEARS_PER_PAGE - 1}`,
      zoomOut: undefined,
      zoomOutLabel: undefined,
      step: shiftMonths,
      stepBy: 12 * YEARS_PER_PAGE,
      previousLabel: t('previousYears'),
      nextLabel: t('nextYears'),
    },
  }[mode];

  const cellClasses = (isSelected: boolean, isToday: boolean) =>
    cn(
      'w-full text-sm',
      isSelected
        ? 'bg-accent font-medium text-background hover:bg-accent-hover'
        : isToday
          ? 'bg-contrast/10 font-medium text-accent'
          : 'text-contrast hover:text-accent',
    );

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border bg-background/50 px-4 py-3 text-sm backdrop-blur-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
              value
                ? 'border-accent/50 pr-12 text-accent'
                : 'border-contrast/20 text-contrast hover:border-accent/30 hover:text-accent',
            )}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              {value
                ? format.dateTime(parseDateKey(value), 'long')
                : (placeholder ?? t('placeholder'))}
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] space-y-4">
          <div className="flex items-center justify-between gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => header.step(-header.stepBy)}
              aria-label={header.previousLabel}
            >
              <ChevronIcon direction="left" />
            </Button>

            <h3 className="min-w-0 flex-1 text-center">
              {header.zoomOut ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full font-medium text-accent hover:bg-accent/10"
                  onClick={header.zoomOut}
                  aria-label={header.zoomOutLabel}
                >
                  {header.title}
                </Button>
              ) : (
                <span className="block py-1 font-medium text-accent">{header.title}</span>
              )}
            </h3>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => header.step(header.stepBy)}
              aria-label={header.nextLabel}
            >
              <ChevronIcon direction="right" />
            </Button>
          </div>

          {mode === 'day' && (
            <>
              <div className="grid grid-cols-7 gap-1 text-xs font-medium text-contrast/60">
                {weekdayNames.map((day) => (
                  <div key={day} className="p-2 text-center">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekday }, (_, index) => (
                  <div key={`empty-${index}`} />
                ))}

                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;
                  const dateKey = toDateKey(new Date(year, month, day));

                  return (
                    <Button
                      key={day}
                      variant="ghost"
                      size="icon-sm"
                      className={cellClasses(value === dateKey, dateKey === todayKey)}
                      onClick={() => {
                        onChange(dateKey);
                        setIsOpen(false);
                      }}
                    >
                      {day}
                    </Button>
                  );
                })}
              </div>
            </>
          )}

          {mode === 'month' && (
            <div className="grid grid-cols-3 gap-1">
              {monthNames.map((name, index) => (
                <Button
                  key={name}
                  variant="ghost"
                  size="sm"
                  className={cellClasses(
                    value !== '' &&
                      parseDateKey(value).getFullYear() === year &&
                      parseDateKey(value).getMonth() === index,
                    today.getFullYear() === year && today.getMonth() === index,
                  )}
                  onClick={() => {
                    setViewMonth(new Date(year, index, 1));
                    setMode('day');
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
          )}

          {mode === 'year' && (
            <div className="grid grid-cols-3 gap-1">
              {years.map((candidate) => (
                <Button
                  key={candidate}
                  variant="ghost"
                  size="sm"
                  className={cellClasses(
                    value !== '' && parseDateKey(value).getFullYear() === candidate,
                    today.getFullYear() === candidate,
                  )}
                  onClick={() => {
                    setViewMonth(new Date(candidate, month, 1));
                    setMode('month');
                  }}
                >
                  {candidate}
                </Button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-accent"
          onClick={() => onChange('')}
          aria-label={t('clear')}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Button>
      )}
    </div>
  );
}
