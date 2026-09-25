import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

/**
 * Derived RAID state (REQ-048, design §11.1) — pure functions, evaluated with
 * "today" in APP_TIMEZONE. A missing status is treated as open so that an
 * unclassified item is never hidden from open/overdue views.
 */
export type LifecycleSemantic = 'OPEN' | 'DONE' | 'INACTIVE';

export function isOpenSemantic(semantic: string | null | undefined): boolean {
  return semantic === null || semantic === undefined || semantic === 'OPEN';
}

export function isOverdue(
  dueDate: string | null,
  statusSemantic: string | null | undefined,
  today: string,
): boolean {
  return Boolean(dueDate && dueDate < today && isOpenSemantic(statusSemantic));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from date raised to closed date (or today while open); never negative. */
export function daysOpen(dateRaised: string, closedDate: string | null, today: string): number {
  const end = Date.parse(`${closedDate ?? today}T00:00:00Z`);
  const start = Date.parse(`${dateRaised}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

/**
 * Closed date follows the status: auto-filled (today, never before date raised)
 * on transition to DONE/INACTIVE when blank, kept when provided, cleared on reopen.
 */
export function resolveClosedDate(
  statusSemantic: string | null | undefined,
  closedDate: string | null,
  dateRaised: string,
  today: string,
): string | null {
  if (isOpenSemantic(statusSemantic)) return null;
  if (closedDate) return closedDate;
  return today < dateRaised ? dateRaised : today;
}

/** SQL: the status column is empty or refers to a reference value with semantic OPEN. */
export function openStatusSql(statusColumn: SQLWrapper): SQL {
  return sql`(${statusColumn} IS NULL OR EXISTS (
    SELECT 1 FROM reference_values rv WHERE rv.id = ${statusColumn} AND rv.semantic = 'OPEN'))`;
}
