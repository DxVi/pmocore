import { ApiClientError } from './api-client';

/** User-safe message for any error surfaced in the UI. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return 'Something went wrong. Please try again.';
}
