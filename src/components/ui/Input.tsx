'use client';

import { useTranslations } from 'next-intl';
import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface InputProps extends ComponentPropsWithRef<'input'> {
  /** Icon or button pinned to the right edge, inside the field. */
  trailing?: ReactNode;
}

export function Input({ className, trailing, ...props }: InputProps) {
  const input = (
    <input
      className={cn(
        'w-full rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-foreground',
        'placeholder:text-placeholder',
        'transition-colors focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        trailing && 'pr-12',
        className,
      )}
      {...props}
    />
  );

  if (!trailing) return input;

  return (
    <div className="relative">
      {input}
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
        {trailing}
      </span>
    </div>
  );
}

/**
 * A password field the user can read back.
 *
 * Typing a password blind is where a lockout starts, and on the profile screen
 * a typo revokes every session of the account at once. The toggle is a button
 * and not a checkbox so that it never becomes part of the form's value.
 */
export function PasswordInput(props: Omit<InputProps, 'type' | 'trailing'>) {
  const t = useTranslations('common.password');
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Input
      {...props}
      type={isVisible ? 'text' : 'password'}
      trailing={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isVisible ? t('hide') : t('show')}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      }
    />
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}
