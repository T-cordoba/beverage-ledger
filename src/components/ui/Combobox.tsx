'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import {
  CheckIcon,
  ChevronDownIcon,
  selectTriggerClassName,
  type SelectOption,
  type SelectProps,
} from './Select';

/** "Añejo" and "anejo" are the same search: nobody types the accent on a filter. */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * A select with a filter box, for lists too long to scroll.
 *
 * Built on Popover rather than Radix Select: Select owns every keystroke for its
 * jump-to-letter typeahead, so a text input inside it loses focus on each key.
 * The trigger keeps the combobox role and the options keep theirs, so it reads
 * and is driven like the plain `Select` it replaces.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  disabled,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: Readonly<SelectProps>) {
  const t = useTranslations('common.select');
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const needle = normalize(query.trim());
  const visible = options.filter((option) => normalize(option.label).includes(needle));
  const selected = options.find((option) => option.value === value);
  const optionId = (index: number) => `${listId}-${index}`;

  const toggle = (next: boolean) => {
    setOpen(next);
    setQuery('');
    setActive(Math.max(0, options.indexOf(selected ?? options[0])));
  };

  const choose = (option: SelectOption) => {
    onValueChange(option.value);
    toggle(false);
  };

  const moveTo = (index: number) => {
    const clamped = Math.min(Math.max(index, 0), visible.length - 1);
    setActive(clamped);
    document.getElementById(optionId(clamped))?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowUp: active - 1,
      Home: 0,
      End: visible.length - 1,
    };

    if (event.key in moves) {
      event.preventDefault();
      moveTo(moves[event.key]);
    } else if (event.key === 'Enter' && visible[active]) {
      event.preventDefault();
      choose(visible[active]);
    }
  };

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={selectTriggerClassName(size, className)}
        >
          <span className="truncate">{selected?.label}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-accent/60 transition-transform duration-base group-aria-expanded:rotate-180" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden bg-surface p-0 backdrop-blur-none">
        <input
          type="search"
          // The list is the whole point of opening it; the filter is a shortcut into it.
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={t('search')}
          aria-label={t('search')}
          aria-controls={listId}
          aria-activedescendant={visible[active] ? optionId(active) : undefined}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-placeholder focus:outline-none"
        />

        <ul id={listId} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto">
          {visible.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value || '__empty__'}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(option)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  'flex cursor-pointer select-none items-center justify-between gap-2 border-b border-border/40 px-4 py-3 text-sm text-foreground last:border-b-0',
                  index === active && 'bg-accent/10 text-accent',
                  isSelected && 'bg-accent/20 font-medium text-accent',
                )}
              >
                {option.label}
                {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
              </li>
            );
          })}
        </ul>

        {visible.length === 0 && (
          <p className="px-4 py-3 text-sm text-contrast/60">{t('noMatches')}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
