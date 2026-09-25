import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiClientError } from '@/lib/api-client';

/** `setValueAs` for selects bound to reference ids: '' becomes null. */
export const asOptionalNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value);

type ServerIssue = { path?: unknown; message?: unknown };

/**
 * Maps API VALIDATION_ERROR / DUPLICATE field details back onto form fields.
 * Returns the message to show as a form-level error when not field-specific.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | undefined {
  if (!(error instanceof ApiClientError)) return 'Something went wrong. Please try again.';
  let mapped = false;
  if (Array.isArray(error.details)) {
    for (const issue of error.details as ServerIssue[]) {
      if (typeof issue.path === 'string' && fields.includes(issue.path)) {
        setError(issue.path as Path<T>, { type: 'server', message: String(issue.message) });
        mapped = true;
      }
    }
  }
  return mapped ? undefined : error.message;
}
