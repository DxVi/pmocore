import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  db,
  defects,
  releaseRequirements,
  releases,
  requirementWorkItems,
  requirements,
  testCases,
  workItems,
} from '@pmocore/database';
import {
  RECORD_CODE_PREFIXES,
  type Requirement,
  type RequirementCreate,
  type RequirementDetail,
  type RequirementListQuery,
  type RequirementUpdate,
} from '@pmocore/shared';
import { likePattern, pageOffset, paginationMeta } from '../../lib/pagination.js';
import { allocateRecordCode } from '../../lib/record-code.js';
import { assertReferenceFields } from '../reference-data/reference.service.js';
import {
  metaDto,
  notFound,
  openStatusCondition,
  recordRef,
  versionConflict,
} from '../work-items/record-support.js';

type RequirementRow = typeof requirements.$inferSelect;
const ENTITY = 'Requirement';

export function toRequirementDto(row: RequirementRow): Requirement {
  return {
    ...metaDto(row),
    module: row.module,
    dateRaised: row.dateRaised,
    source: row.source,
    statement: row.statement,
    acceptanceCriteria: row.acceptanceCriteria,
    requirementTypeId: row.typeId,
    priorityId: row.priorityId,
    assigneeName: row.assigneeName,
    statusId: row.statusId,
    targetReleaseId: row.targetReleaseId,
    isChangeRequest: row.isChangeRequest,
    changeRequestRaidId: row.changeRequestRaidId,
    validationEvidence: row.validationEvidence,
    remarks: row.remarks,
  };
}

/** Maps the API field names onto columns (`requirementTypeId` is stored as `type_id`). */
function toColumns(input: RequirementCreate) {
  const { requirementTypeId, ...rest } = input;
  return { ...rest, typeId: requirementTypeId };
}

const refFields = (input: {
  requirementTypeId: number | null;
  priorityId: number | null;
  statusId: number | null;
}) => ({
  requirementTypeId: input.requirementTypeId,
  priorityId: input.priorityId,
  statusId: input.statusId,
});

const SORTS = {
  code: requirements.code,
  dateRaised: requirements.dateRaised,
  updatedAt: requirements.updatedAt,
  priority: sql`(SELECT rv.sort_order FROM reference_values rv WHERE rv.id = "requirements"."priority_id")`,
} as const;

export async function listRequirements(projectId: string, query: RequirementListQuery) {
  const conditions: (SQL | undefined)[] = [eq(requirements.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(requirements.code, pattern),
        ilike(requirements.statement, pattern),
        ilike(requirements.module, pattern),
        ilike(requirements.source, pattern),
        ilike(requirements.assigneeName, pattern),
      ),
    );
  }
  if (query.statusId) conditions.push(eq(requirements.statusId, query.statusId));
  if (query.priorityId) conditions.push(eq(requirements.priorityId, query.priorityId));
  if (query.requirementTypeId) conditions.push(eq(requirements.typeId, query.requirementTypeId));
  if (query.targetReleaseId)
    conditions.push(eq(requirements.targetReleaseId, query.targetReleaseId));
  if (query.changeRequest !== undefined) {
    conditions.push(eq(requirements.isChangeRequest, query.changeRequest));
  }
  if (query.open === true) conditions.push(openStatusCondition(requirements.statusId));
  if (query.open === false) conditions.push(sql`NOT ${openStatusCondition(requirements.statusId)}`);
  const where = and(...conditions);
  const direction = query.dir === 'asc' ? asc : desc;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(requirements)
      .where(where)
      .orderBy(sql`${direction(SORTS[query.sort])} NULLS LAST`, asc(requirements.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(requirements).where(where),
  ]);
  return {
    items: rows.map(toRequirementDto),
    meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0),
  };
}

async function findRow(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(requirements)
    .where(and(eq(requirements.projectId, projectId), eq(requirements.id, id)))
    .limit(1);
  return row;
}

/**
 * Trace view (design §11.2): requirement → work items → tests (latest result) →
 * defects (status, retest) → target release and released-in history with the
 * latest acceptance status of each release.
 */
export async function getRequirement(projectId: string, id: string): Promise<RequirementDetail> {
  const row = await findRow(projectId, id);
  if (!row) throw notFound(ENTITY);

  const [linkedWorkItems, tests, targetRelease, releasedIn] = await Promise.all([
    db
      .select({ id: workItems.id, code: workItems.code, title: workItems.title })
      .from(requirementWorkItems)
      .innerJoin(workItems, eq(workItems.id, requirementWorkItems.workItemId))
      .where(
        and(
          eq(requirementWorkItems.projectId, projectId),
          eq(requirementWorkItems.requirementId, id),
        ),
      )
      .orderBy(asc(workItems.code)),
    db
      .select({
        id: testCases.id,
        code: testCases.code,
        title: sql<string>`left(${testCases.scenario}, 160)`,
        resultId: testCases.resultId,
      })
      .from(testCases)
      .where(and(eq(testCases.projectId, projectId), eq(testCases.requirementId, id)))
      .orderBy(asc(testCases.code)),
    recordRef('releases', projectId, row.targetReleaseId),
    db
      .select({
        id: releases.id,
        code: releases.code,
        title: releases.versionLabel,
        note: releaseRequirements.note,
        acceptanceStatusId: sql<number | null>`(
          SELECT a.status_id FROM acceptances a
          WHERE a.project_id = "releases"."project_id" AND a.release_id = "releases"."id"
          ORDER BY a.created_at DESC LIMIT 1)`,
      })
      .from(releaseRequirements)
      .innerJoin(releases, eq(releases.id, releaseRequirements.releaseId))
      .where(
        and(
          eq(releaseRequirements.projectId, projectId),
          eq(releaseRequirements.requirementId, id),
        ),
      )
      .orderBy(asc(releases.releaseDate), asc(releases.code)),
  ]);

  const testIds = tests.map((t) => t.id);
  const relatedDefects =
    testIds.length === 0
      ? []
      : await db
          .select({
            id: defects.id,
            code: defects.code,
            title: defects.title,
            testCaseId: defects.testCaseId,
            statusId: defects.statusId,
            retestResultId: defects.retestResultId,
          })
          .from(defects)
          .where(and(eq(defects.projectId, projectId), inArray(defects.testCaseId, testIds)))
          .orderBy(asc(defects.code));

  return {
    ...toRequirementDto(row),
    workItems: linkedWorkItems,
    tests,
    defects: relatedDefects,
    targetRelease,
    releasedIn,
  };
}

export async function createRequirement(
  projectId: string,
  actorId: string,
  input: RequirementCreate,
) {
  await assertReferenceFields(refFields(input));
  const row = await db.transaction(async (tx) => {
    const code = await allocateRecordCode(
      tx,
      projectId,
      'requirement',
      RECORD_CODE_PREFIXES.requirement,
    );
    const [inserted] = await tx
      .insert(requirements)
      .values({ ...toColumns(input), projectId, code, createdBy: actorId, updatedBy: actorId })
      .returning();
    return inserted;
  });
  if (!row) throw new Error('Requirement insert returned no row');
  return getRequirement(projectId, row.id);
}

export async function updateRequirement(
  projectId: string,
  id: string,
  actorId: string,
  input: RequirementUpdate,
) {
  const current = await findRow(projectId, id);
  if (!current) throw notFound(ENTITY);
  await assertReferenceFields(
    refFields(input),
    refFields({ ...current, requirementTypeId: current.typeId }),
  );
  const { version, ...fields } = input;
  const [row] = await db
    .update(requirements)
    .set({
      ...toColumns(fields),
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${requirements.version} + 1`,
    })
    .where(
      and(
        eq(requirements.projectId, projectId),
        eq(requirements.id, id),
        eq(requirements.version, version),
      ),
    )
    .returning();
  if (!row) throw versionConflict('requirement');
  return getRequirement(projectId, id);
}

/** Work-item links go with it; tests, releases, RAID or documents referencing it block deletion (409). */
export async function deleteRequirement(projectId: string, id: string) {
  const deleted = await db
    .delete(requirements)
    .where(and(eq(requirements.projectId, projectId), eq(requirements.id, id)))
    .returning({ id: requirements.id });
  if (deleted.length === 0) throw notFound(ENTITY);
}

/**
 * Replaces the full set of work items linked to a requirement in one transaction
 * (REQ-027/069). Composite keys reject work items from other projects.
 */
export async function replaceRequirementWorkItems(
  projectId: string,
  requirementId: string,
  actorId: string,
  workItemIds: string[],
) {
  const unique = [...new Set(workItemIds.map((id) => id.toLowerCase()))];
  await db.transaction(async (tx) => {
    const [requirement] = await tx
      .select({ id: requirements.id })
      .from(requirements)
      .where(and(eq(requirements.projectId, projectId), eq(requirements.id, requirementId)))
      .limit(1)
      .for('update');
    if (!requirement) throw notFound(ENTITY);

    await tx
      .delete(requirementWorkItems)
      .where(
        and(
          eq(requirementWorkItems.requirementId, requirementId),
          unique.length > 0 ? notInArray(requirementWorkItems.workItemId, unique) : undefined,
        ),
      );
    if (unique.length > 0) {
      await tx
        .insert(requirementWorkItems)
        .values(
          unique.map((workItemId) => ({
            projectId,
            requirementId,
            workItemId,
            createdBy: actorId,
          })),
        )
        .onConflictDoNothing();
    }
    await tx
      .update(requirements)
      .set({ updatedAt: new Date(), updatedBy: actorId })
      .where(eq(requirements.id, requirementId));
  });
  return getRequirement(projectId, requirementId);
}
