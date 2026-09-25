import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { db, projects } from '@pmocore/database';
import type { DashboardProject, DashboardResponse, ProjectMetrics } from '@pmocore/shared';
import { todayInTimeZone } from '../../lib/today.js';
import { buildProjectMetrics, emptyAggregates, type RawProjectAggregates } from './metrics.js';

type ProjectRow = typeof projects.$inferSelect;

const OPEN = (column: string) =>
  `(${column} IS NULL OR EXISTS (SELECT 1 FROM reference_values rv WHERE rv.id = ${column} AND rv.semantic = 'OPEN'))`;

type Row = Record<string, unknown> & { project_id: string };

async function rows(query: SQL): Promise<Row[]> {
  return (await db.execute<Row>(query)).rows;
}

const num = (value: unknown) => Number(value ?? 0);

/**
 * Reads all dashboard aggregates for the given projects with one grouped query
 * per record type — the number of queries does not grow with the number of projects.
 */
export async function loadAggregates(
  projectRows: ProjectRow[],
  today: string,
): Promise<Map<string, RawProjectAggregates>> {
  const ids = projectRows.map((p) => p.id);
  const result = new Map(
    projectRows.map((p) => [p.id, emptyAggregates(p.updatedAt.toISOString())] as const),
  );
  if (ids.length === 0) return result;
  // Drizzle expands JS arrays into value lists, so build an explicit uuid array.
  const idList = sql`ARRAY[${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )}]::uuid[]`;

  const [plan, reqs, raid, tests, defectRows, milestones, activity] = await Promise.all([
    rows(sql`
      SELECT w.project_id,
        count(*)::int AS items,
        avg(CASE WHEN s.semantic = 'DONE' THEN 100 ELSE w.percent_complete END)::float AS average
      FROM work_items w LEFT JOIN reference_values s ON s.id = w.status_id
      WHERE w.project_id = ANY(${idList}) AND (s.semantic IS NULL OR s.semantic <> 'INACTIVE')
      GROUP BY w.project_id`),
    rows(sql`
      SELECT project_id, count(*)::int AS total,
        count(*) FILTER (WHERE ${sql.raw(OPEN('status_id'))})::int AS open
      FROM requirements WHERE project_id = ANY(${idList}) GROUP BY project_id`),
    rows(sql`
      SELECT r.project_id, t.code AS type_code, count(*)::int AS total,
        count(*) FILTER (WHERE ${sql.raw(OPEN('r.status_id'))})::int AS open,
        count(*) FILTER (WHERE ${sql.raw(OPEN('r.status_id'))} AND r.due_date < ${today})::int AS overdue
      FROM raid_items r JOIN reference_values t ON t.id = r.type_id
      WHERE r.project_id = ANY(${idList}) AND t.code IN ('ACTION', 'ISSUE')
      GROUP BY r.project_id, t.code`),
    rows(sql`
      SELECT tc.project_id, count(*)::int AS total,
        count(*) FILTER (WHERE res.semantic = 'FAIL')::int AS failed,
        count(*) FILTER (WHERE res.semantic = 'RETEST')::int AS retest
      FROM test_cases tc LEFT JOIN reference_values res ON res.id = tc.result_id
      WHERE tc.project_id = ANY(${idList}) GROUP BY tc.project_id`),
    rows(sql`
      SELECT project_id, count(*)::int AS total,
        count(*) FILTER (WHERE ${sql.raw(OPEN('status_id'))})::int AS open
      FROM defects WHERE project_id = ANY(${idList}) GROUP BY project_id`),
    rows(sql`
      SELECT DISTINCT ON (project_id) project_id, title, planned_end::text AS date
      FROM work_items
      WHERE project_id = ANY(${idList}) AND is_milestone AND planned_end >= ${today}
        AND ${sql.raw(OPEN('status_id'))}
      ORDER BY project_id, planned_end ASC, code ASC`),
    rows(sql`
      SELECT project_id, max(updated_at) AS last FROM (
        SELECT id AS project_id, updated_at FROM projects WHERE id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM work_items WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM requirements WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM activities WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM raid_items WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM test_cases WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM defects WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM releases WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM acceptances WHERE project_id = ANY(${idList})
        UNION ALL SELECT project_id, updated_at FROM documents WHERE project_id = ANY(${idList})
      ) AS changes GROUP BY project_id`),
  ]);

  const get = (id: string) => result.get(id);
  for (const r of plan) {
    const a = get(r.project_id);
    if (a) {
      a.planItems = num(r.items);
      a.planPercentAverage = r.average === null ? null : Number(r.average);
    }
  }
  for (const r of reqs) {
    const a = get(r.project_id);
    if (a) Object.assign(a, { requirementsTotal: num(r.total), requirementsOpen: num(r.open) });
  }
  for (const r of raid) {
    const a = get(r.project_id);
    if (!a) continue;
    if (r.type_code === 'ACTION') {
      Object.assign(a, {
        actionsTotal: num(r.total),
        actionsOpen: num(r.open),
        actionsOverdue: num(r.overdue),
      });
    } else {
      Object.assign(a, { issuesTotal: num(r.total), issuesOpen: num(r.open) });
    }
  }
  for (const r of tests) {
    const a = get(r.project_id);
    if (a)
      Object.assign(a, {
        testsTotal: num(r.total),
        testsFailed: num(r.failed),
        testsRetest: num(r.retest),
      });
  }
  for (const r of defectRows) {
    const a = get(r.project_id);
    if (a) Object.assign(a, { defectsTotal: num(r.total), defectsOpen: num(r.open) });
  }
  for (const r of milestones) {
    const a = get(r.project_id);
    if (a) a.milestone = { title: String(r.title), date: String(r.date) };
  }
  for (const r of activity) {
    const a = get(r.project_id);
    if (a && r.last) a.lastActivityAt = new Date(r.last as string).toISOString();
  }
  return result;
}

function toDashboardProject(project: ProjectRow, metrics: ProjectMetrics): DashboardProject {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    phaseId: project.phaseId,
    statusId: project.statusId,
    healthId: project.healthId,
    targetDate: project.targetDate,
    pmRemarks: project.pmRemarks,
    metrics,
  };
}

const manual = (p: ProjectRow) => ({ label: p.nextMilestoneLabel, date: p.nextMilestoneDate });

/** Dashboard over the actor's active (non-archived) projects (REQ-006–011). */
export async function getDashboard(actorId: string): Promise<DashboardResponse> {
  const today = todayInTimeZone();
  const projectRows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerUserId, actorId), isNull(projects.archivedAt)))
    .orderBy(asc(projects.code));
  const aggregates = await loadAggregates(projectRows, today);

  const items = projectRows.map((p) => {
    const raw = aggregates.get(p.id) ?? emptyAggregates(p.updatedAt.toISOString());
    return toDashboardProject(p, buildProjectMetrics(raw, manual(p), today));
  });

  const sum = (pick: (m: ProjectMetrics) => number) =>
    items.reduce((total, p) => total + pick(p.metrics), 0);
  return {
    projects: items,
    totals: {
      activeProjects: items.length,
      openRequirements: sum((m) => m.requirements.open),
      openActions: sum((m) => m.actions.open),
      overdueActions: sum((m) => m.actions.overdue),
      openIssues: sum((m) => m.issues.open),
      failedTests: sum((m) => m.tests.failed),
    },
  };
}

/** Metrics for one (already access-checked) project, including archived projects. */
export async function getProjectMetrics(project: ProjectRow): Promise<ProjectMetrics> {
  const today = todayInTimeZone();
  const raw =
    (await loadAggregates([project], today)).get(project.id) ??
    emptyAggregates(project.updatedAt.toISOString());
  return buildProjectMetrics(raw, manual(project), today);
}
