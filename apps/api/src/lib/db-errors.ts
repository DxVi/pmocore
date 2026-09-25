import { AppError } from './app-error.js';

type PgError = { code: string; constraint?: string; message: string };

function isPgError(value: unknown): value is PgError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { code?: unknown }).code === 'string' &&
    /^[0-9A-Z]{5}$/.test((value as { code: string }).code)
  );
}

/** Drizzle wraps driver errors; the PostgreSQL error is the error itself or its cause. */
function findPgError(err: unknown): PgError | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 3 && current; depth += 1) {
    if (isPgError(current)) return current;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Friendly messages for known unique constraints. Constraint names never reach clients. */
const UNIQUE_MESSAGES: Record<string, { field: string; message: string }> = {
  projects_code_unique: { field: 'code', message: 'A project with this code already exists' },
  releases_project_version_key: {
    field: 'versionLabel',
    message: 'A release with this version already exists in this project',
  },
};

/**
 * Maps PostgreSQL integrity errors to safe API errors (design §12).
 * Returns undefined for anything that is not a recognized database error.
 */
export function mapDatabaseError(err: unknown): AppError | undefined {
  const pg = findPgError(err);
  if (!pg) return undefined;

  switch (pg.code) {
    case '23505': {
      const known = pg.constraint ? UNIQUE_MESSAGES[pg.constraint] : undefined;
      return new AppError(
        409,
        'DUPLICATE',
        known?.message ?? 'A record with the same value already exists',
        known ? [{ path: known.field, message: known.message }] : undefined,
      );
    }
    case '23001':
      return new AppError(409, 'RECORD_IN_USE', 'This record is referenced by other records');
    case '23503':
      // Delete/update of a referenced row vs. insert/update pointing at a missing row.
      return /update or delete on table/i.test(pg.message)
        ? new AppError(409, 'RECORD_IN_USE', 'This record is referenced by other records')
        : new AppError(400, 'VALIDATION_ERROR', 'A related record does not exist in this project');
    case '23514':
    case '23502':
    case '22P02':
    case '22007':
    case '22008':
    case '22001':
      return new AppError(400, 'VALIDATION_ERROR', 'One or more values are invalid');
    default:
      return undefined;
  }
}
