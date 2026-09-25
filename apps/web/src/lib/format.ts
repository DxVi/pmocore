import { format, formatDistanceToNow, parseISO } from 'date-fns';

/** Formats a business date (YYYY-MM-DD); returns undefined when not recorded. */
export function formatDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return format(parseISO(value), 'd MMM yyyy');
}

export function formatDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return format(parseISO(value), 'd MMM yyyy, h:mm a');
}

export function formatRelative(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return formatDistanceToNow(parseISO(value), { addSuffix: true });
}
