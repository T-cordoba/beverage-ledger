/** Every API failure has this shape; `message` is an array on validation errors. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' && value !== null && 'statusCode' in value && 'message' in value;

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: unknown) {
    const parsed = isApiErrorBody(body) ? body : null;
    super(parsed ? [parsed.message].flat().join('. ') : `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = parsed;
  }

  /** Validation failures arrive as one string per offending field. */
  get messages(): string[] {
    return this.body ? [this.body.message].flat() : [this.message];
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const isUnauthorized = (error: unknown): boolean =>
  isApiError(error) && error.status === 401;

export function describeError(error: unknown, fallback: string): string {
  if (isApiError(error)) return error.messages.join('. ');
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
