/**
 * What is wrong with a value, as data rather than as a sentence.
 *
 * The rules stay free of next-intl so they can be read and reasoned about on
 * their own; `useFormValidation` is what turns an issue into copy.
 */
export type FieldIssue =
  | { kind: 'required' }
  | { kind: 'minLength'; count: number }
  | { kind: 'email' }
  | { kind: 'url' }
  | { kind: 'number' }
  | { kind: 'min'; min: number }
  | { kind: 'max'; max: number }
  | { kind: 'integer' }
  | { kind: 'mismatch' };

const REQUIRED: FieldIssue = { kind: 'required' };

/**
 * A free-text field.
 *
 * Length is measured on the trimmed value, which is what the API is sent: a name
 * of two spaces passes `minLength` in the browser and fails on the server.
 */
export function text(
  value: string,
  { optional = false, minLength = 0 }: { optional?: boolean; minLength?: number } = {},
): FieldIssue | undefined {
  const trimmed = value.trim();

  if (trimmed === '') return optional ? undefined : REQUIRED;
  if (trimmed.length < minLength) return { kind: 'minLength', count: minLength };
  return undefined;
}

/** A secret, which is never trimmed: leading and trailing spaces are part of it. */
export function secret(value: string, { minLength = 0 }: { minLength?: number } = {}) {
  if (value === '') return REQUIRED;
  if (value.length < minLength) return { kind: 'minLength', count: minLength } as const;
  return undefined;
}

// Deliberately loose. The address is proven by the invitation that gets
// delivered, so anything stricter only rejects addresses that do work.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function email(value: string, { optional = false } = {}): FieldIssue | undefined {
  const trimmed = value.trim();

  if (trimmed === '') return optional ? undefined : REQUIRED;
  return EMAIL.test(trimmed) ? undefined : { kind: 'email' };
}

export function url(value: string, { optional = true } = {}): FieldIssue | undefined {
  const trimmed = value.trim();

  if (trimmed === '') return optional ? undefined : REQUIRED;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? undefined
      : { kind: 'url' };
  } catch {
    return { kind: 'url' };
  }
}

/** A number typed into a text field, so the empty string is the absent value. */
export function numeric(
  value: string,
  {
    optional = true,
    min,
    max,
    integer = false,
  }: { optional?: boolean; min?: number; max?: number; integer?: boolean } = {},
): FieldIssue | undefined {
  const trimmed = value.trim();

  if (trimmed === '') return optional ? undefined : REQUIRED;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { kind: 'number' };
  if (integer && !Number.isInteger(parsed)) return { kind: 'integer' };
  if (min !== undefined && parsed < min) return { kind: 'min', min };
  if (max !== undefined && parsed > max) return { kind: 'max', max };
  return undefined;
}

/** A select, where the empty value is the placeholder and not a choice. */
export function chosen(value: string): FieldIssue | undefined {
  return value === '' ? REQUIRED : undefined;
}

export function matches(value: string, expected: string): FieldIssue | undefined {
  if (value === '') return REQUIRED;
  return value === expected ? undefined : { kind: 'mismatch' };
}
