import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '@pmocore/database';
import { LookupQuerySchema, type LookupResult, type LookupType } from '@pmocore/shared';
import { sendSuccess } from '../../lib/api-response.js';
import { likePattern } from '../../lib/pagination.js';
import { parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';

/**
 * Compact project-scoped record search for relationship pickers (design §7.2).
 * Table names and title expressions are fixed literals from this map; user input
 * is only ever bound as parameters.
 */
const SOURCES: Record<LookupType, { table: string; title: string }> = {
  'work-item': { table: 'work_items', title: 'title' },
  requirement: { table: 'requirements', title: 'left(statement, 160)' },
  activity: { table: 'activities', title: 'title' },
  'raid-item': { table: 'raid_items', title: 'title' },
  test: { table: 'test_cases', title: 'left(scenario, 160)' },
  defect: { table: 'defects', title: 'title' },
  release: { table: 'releases', title: 'version_label' },
  document: { table: 'documents', title: 'title' },
};

export const lookupRouter = Router({ mergeParams: true });

lookupRouter.get('/', async (req, res) => {
  const query = parseQuery(LookupQuerySchema, req);
  const { table, title } = SOURCES[query.type];
  const titleSql = sql.raw(title);
  const search = query.q
    ? sql`AND (code ILIKE ${likePattern(query.q)} OR ${titleSql} ILIKE ${likePattern(query.q)})`
    : sql``;

  const result = await db.execute<{ id: string; code: string; title: string }>(sql`
    SELECT id, code, ${titleSql} AS title
    FROM ${sql.raw(table)}
    WHERE project_id = ${getProject(req).id} ${search}
    ORDER BY updated_at DESC
    LIMIT ${query.limit}`);

  const data: LookupResult = result.rows.map(({ id, code, title: text }) => ({
    id,
    code,
    title: text,
  }));
  sendSuccess(res, data);
});
