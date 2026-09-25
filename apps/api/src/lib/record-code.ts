import { sql } from 'drizzle-orm';
import type { db } from '@pmocore/database';
import { formatRecordCode } from '@pmocore/shared';

type Executor = Pick<typeof db, 'execute'>;

/**
 * Allocates the next stable record code for a project (design §5.5). Must be
 * called inside the record's create transaction; the row-level upsert
 * serializes concurrent allocations for the same project and record type.
 */
export async function allocateRecordCode(
  tx: Executor,
  projectId: string,
  recordType: string,
  prefix: string,
): Promise<string> {
  const result = await tx.execute<{ value: number }>(sql`
    INSERT INTO record_counters (project_id, record_type, next_value)
    VALUES (${projectId}, ${recordType}, 2)
    ON CONFLICT (project_id, record_type)
    DO UPDATE SET next_value = record_counters.next_value + 1
    RETURNING next_value - 1 AS value`);
  const value = result.rows[0]?.value;
  if (typeof value !== 'number') throw new Error('Record code allocation failed');
  return formatRecordCode(prefix, value);
}
