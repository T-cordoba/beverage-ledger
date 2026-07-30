'use client';

import { useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import {
  cn,
  formatLongDate,
  formatMonthYear,
  getWeekdayNames,
  parseDateKey,
  toDateKey,
} from '@/lib/utils';

interface CalendarProps {
  /** `YYYY-MM-DD`, or empty for no filter. */
  dateFilter: string;
  setDateFilter: (date: string) => void;
}

const weekdayNames = getWeekdayNames();

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function Calendar({ dateFilter, setDateFilter }: CalendarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // The month on screen is separate from the selected day: paging through
  // months used to overwrite the filter with the 1st of each month visited.
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(dateFilter ? parseDateKey(dateFilter) : new Date()),
  );

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setViewMonth(startOfMonth(dateFilter ? parseDateKey(dateFilter) : new Date()));
    }
    setIsOpen(open);
  };

  const shiftMonth = (offset: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = viewMonth.getDay();
  const todayKey = toDateKey(new Date());

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border bg-background/50 px-4 py-3 text-sm backdrop-blur-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
              dateFilter
                ? 'border-accent/50 text-accent'
                : 'border-contrast/20 text-contrast hover:border-accent/30 hover:text-accent',
              dateFilter && 'pr-12',
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
            <span>{dateFilter ? formatLongDate(parseDateKey(dateFilter)) : 'Filter by date'}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
            <h3 className="font-medium text-accent">{formatMonthYear(viewMonth)}</h3>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>

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
              const isSelected = dateFilter === dateKey;

              return (
                <Button
                  key={day}
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    'w-full text-sm',
                    isSelected
                      ? 'bg-accent font-medium text-background hover:bg-accent-hover'
                      : dateKey === todayKey
                        ? 'bg-contrast/10 font-medium text-accent'
                        : 'text-contrast hover:text-accent',
                  )}
                  onClick={() => {
                    setDateFilter(dateKey);
                    setIsOpen(false);
                  }}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {dateFilter && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-accent"
          onClick={() => setDateFilter('')}
          aria-label="Clear date filter"
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
