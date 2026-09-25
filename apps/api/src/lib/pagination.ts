import type { PaginationMeta } from '@pmocore/shared';

export function pageOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function paginationMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  return { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) };
}

/** Escapes LIKE wildcards so user search text is matched literally. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export const toIso = (value: Date | null): string | null => (value ? value.toISOString() : null);
