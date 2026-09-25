/**
 * Helpers shared by the Package 3 modules (plan, requirements, testing,
 * releases, documents). Kept inside a PKG-3 owned directory (tasks.md §3.3).
 */
import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { db } from '@pmocore/database';
import type { RecordRef } from '@pmocore/shared';
import { AppError } from '../../lib/app-error.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const notFound = (entity: string) => new AppError(404, 'NOT_FOUND', `${entity} not found`);

export const versionConflict = (entity: string) =>
  new AppError(
    409,
    'VERSION_CONFLICT',
    `This ${entity} was changed elsewhere. Reload to see the latest version.`,
  );

/** Audit/identity fields common to every record DTO. */
export function metaDto(row: {
  id: string;
  projectId: string;
  code: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
}) {
  return {
    id: row.id,
    projectId: row.projectId,
    code: row.code,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

/** SQL: the status column is empty or refers to a reference value with semantic OPEN. */
export function openStatusCondition(statusColumn: SQLWrapper): SQL {
  return sql`(${statusColumn} IS NULL OR EXISTS (
    SELECT 1 FROM reference_values rv WHERE rv.id = ${statusColumn} AND rv.semantic = 'OPEN'))`;
}

/** Title expression per record table, for compact record references. */
export const REF_TITLES = {
  work_items: 'title',
  requirements: 'left(statement, 160)',
  activities: 'title',
  test_cases: 'left(scenario, 160)',
  defects: 'title',
  releases: 'version_label',
  documents: 'title',
} as const;

export type RefTable = keyof typeof REF_TITLES;

/** Loads a compact reference to one record in the project, or null. */
export async function recordRef(
  table: RefTable,
  projectId: string,
  id: string | null,
): Promise<RecordRef | null> {
  if (!id) return null;
  const result = await db.execute<RecordRef>(sql`
    SELECT id, code, ${sql.raw(REF_TITLES[table])} AS title
    FROM ${sql.raw(table)} WHERE project_id = ${projectId} AND id = ${id}`);
  return result.rows[0] ?? null;
}

/** De-duplicates items by a key, keeping the last occurrence. */
export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}
