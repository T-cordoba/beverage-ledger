'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { FieldIssue } from './rules';

/**
 * Where a failed attempt sends the caret. Radix renders a Select as a button, so
 * the list is wider than the native form controls.
 */
const FIRST_INVALID_CONTROL = '[data-invalid] :is(input, textarea, select, button)';

export interface FormValidation<K extends string, E extends HTMLElement = HTMLFormElement> {
  /** Goes on the element that wraps the fields. The focus jump searches inside it. */
  ref: RefObject<E | null>;
  /** Wraps a submit handler: it only runs once every rule passes. */
  onSubmit: (onValid: () => void) => (event: FormEvent) => void;
  /**
   * Records an attempt outside a submit — a button that would otherwise be
   * disabled. Returns whether the form may go through.
   */
  attempt: () => boolean;
  /** The message for a field, once it is fair to show one. */
  errorFor: (field: K) => string | undefined;
  /** Call on blur, so leaving a field empty says so without waiting for submit. */
  touch: (field: K) => void;
  isValid: boolean;
  /** Summary for the top of the form. Set only after an attempt that failed. */
  alert: string | undefined;
}

/**
 * Field-level validation with our own messages instead of the browser's.
 *
 * The native constraints (`required`, `minLength`, `type="email"`) show a bubble
 * that is styled by the browser, worded by the locale of the operating system
 * rather than the app, and gone on the next keystroke. So every form carries
 * `noValidate` and reports through `Field`, which is also where the message ends
 * up wired to the control for a screen reader.
 *
 * Nothing is shown while a field is still being filled in for the first time:
 * an error appears once the field has been left (`touch`) or once an attempt was
 * made. Complaining on the first keystroke of an empty field is noise.
 */
export function useFormValidation<K extends string, E extends HTMLElement = HTMLFormElement>(
  issues: Record<K, FieldIssue | undefined>,
): FormValidation<K, E> {
  const t = useTranslations('common.validation');
  const ref = useRef<E>(null);
  const [touched, setTouched] = useState<Partial<Record<K, true>>>({});
  const [failedAttempts, setFailedAttempts] = useState(0);

  const invalidFields = (Object.keys(issues) as K[]).filter((field) => issues[field] !== undefined);
  const isValid = invalidFields.length === 0;

  // Deferred to an effect because the wrappers only carry `data-invalid` after
  // the render that records the attempt: querying during the click would find
  // nothing on the very first try.
  useEffect(() => {
    if (failedAttempts === 0) return;
    ref.current?.querySelector<HTMLElement>(FIRST_INVALID_CONTROL)?.focus();
  }, [failedAttempts]);

  const describe = (issue: FieldIssue): string => {
    switch (issue.kind) {
      case 'minLength':
        return t('minLength', { count: issue.count });
      case 'min':
        return t('min', { min: issue.min });
      case 'max':
        return t('max', { max: issue.max });
      default:
        return t(issue.kind);
    }
  };

  const attempt = () => {
    if (isValid) return true;
    setFailedAttempts((count) => count + 1);
    return false;
  };

  return {
    ref,
    isValid,
    attempt,
    touch: (field) => setTouched((current) => ({ ...current, [field]: true })),
    errorFor: (field) => {
      const issue = issues[field];
      if (!issue || (failedAttempts === 0 && !touched[field])) return undefined;
      return describe(issue);
    },
    alert:
      failedAttempts > 0 && !isValid ? t('summary', { count: invalidFields.length }) : undefined,
    onSubmit: (onValid) => (event) => {
      event.preventDefault();
      if (attempt()) onValid();
    },
  };
}
