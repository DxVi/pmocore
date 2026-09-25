import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db, projects } from '@pmocore/database';
import type { ProjectListQuery, RecentActivityItem } from '@pmocore/shared';
import { likePattern, pageOffset } from '../../lib/pagination.js';

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;

const SORT_COLUMNS = {
  code: projects.code,
  name: projects.name,
  targetDate: projects.targetDate,
  updatedAt: projects.updatedAt,
} as const;

function listFilter(ownerUserId: string, query: ProjectListQuery): SQL | undefined {
  const conditions: (SQL | undefined)[] = [eq(projects.ownerUserId, ownerUserId)];
  if (query.archived === 'active') conditions.push(isNull(projects.archivedAt));
  if (query.archived === 'archived') conditions.push(isNotNull(projects.archivedAt));
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(or(ilike(projects.code, pattern), ilike(projects.name, pattern)));
  }
  if (query.phaseId) conditions.push(eq(projects.phaseId, query.phaseId));
  if (query.statusId) conditions.push(eq(projects.statusId, query.statusId));
  if (query.healthId) conditions.push(eq(projects.healthId, query.healthId));
  return and(...conditions);
}

export async function listProjects(ownerUserId: string, query: ProjectListQuery) {
  const where = listFilter(ownerUserId, query);
  const column = SORT_COLUMNS[query.sort];
  const order = query.dir === 'asc' ? asc(column) : desc(column);

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(where)
      .orderBy(sql`${order} NULLS LAST`, asc(projects.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(projects).where(where),
  ]);

  return { rows, totalItems: total?.value ?? 0 };
}

export async function insertProject(values: ProjectInsert): Promise<ProjectRow> {
  const [row] = await db.insert(projects).values(values).returning();
  if (!row) throw new Error('Project insert returned no row');
  return row;
}

/** Optimistic-concurrency update: returns undefined when the version no longer matches. */
export async function updateProjectVersioned(
  id: string,
  expectedVersion: number,
  values: Partial<ProjectInsert>,
): Promise<ProjectRow | undefined> {
  const [row] = await db
    .update(projects)
    .set({ ...values, version: sql`${projects.version} + 1`, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.version, expectedVersion)))
    .returning();
  return row;
}

export async function setProjectArchived(
  id: string,
  actorId: string,
  archived: boolean,
): Promise<ProjectRow> {
  const now = new Date();
  const [row] = await db
    .update(projects)
    .set({
      archivedAt: archived ? now : null,
      archivedBy: archived ? actorId : null,
      updatedAt: now,
      updatedBy: actorId,
      version: sql`${projects.version} + 1`,
    })
    .where(eq(projects.id, id))
    .returning();
  if (!row) throw new Error('Project archive update returned no row');
  return row;
}

type ActivityRow = {
  type: RecentActivityItem['type'];
  id: string;
  code: string;
  title: string;
  updated_at: Date | string;
};

/**
 * Most recently changed records across the project (design §11.1): the top 10
 * per table, merged. The project row itself is always included, so the result
 * is never empty and its first row gives the project's last activity.
 */
export async function recentProjectActivity(projectId: string, limit = 10) {
  // Table names, title expressions and type labels are fixed literals from this
  // list; the project id is always a bound parameter.
  const sources: [type: RecentActivityItem['type'], table: string, title: string][] = [
    ['workItem', 'work_items', 'title'],
    ['requirement', 'requirements', 'left(statement, 160)'],
    ['activity', 'activities', 'title'],
    ['raidItem', 'raid_items', 'title'],
    ['testCase', 'test_cases', 'left(scenario, 160)'],
    ['defect', 'defects', 'title'],
    ['release', 'releases', 'version_label'],
    ['acceptance', 'acceptances', "'Acceptance'"],
    ['document', 'documents', 'title'],
  ];
  const limitSql = sql.raw(String(Math.trunc(limit)));
  const parts = sources.map(
    ([type, table, title]) =>
      sql`(SELECT ${sql.raw(`'${type}'`)} AS type, id, code, ${sql.raw(title)} AS title, updated_at
           FROM ${sql.raw(table)} WHERE project_id = ${projectId}
           ORDER BY updated_at DESC LIMIT ${limitSql})`,
  );

  const result = await db.execute<ActivityRow>(sql`
    SELECT * FROM (
      (SELECT 'project' AS type, id, code, name AS title, updated_at FROM projects WHERE id = ${projectId})
      UNION ALL ${sql.join(parts, sql` UNION ALL `)}
    ) AS activity
    ORDER BY updated_at DESC
    LIMIT ${limitSql}`);

  return result.rows.map((row) => ({
    type: row.type,
    id: row.id,
    code: row.code,
    title: row.title,
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}
