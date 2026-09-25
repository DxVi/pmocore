import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db, requirementWorkItems, requirements, workItems } from '@pmocore/database';
import {
  RECORD_CODE_PREFIXES,
  type WorkItem,
  type WorkItemCreate,
  type WorkItemDetail,
  type WorkItemListQuery,
  type WorkItemUpdate,
} from '@pmocore/shared';
import { likePattern, pageOffset, paginationMeta } from '../../lib/pagination.js';
import { allocateRecordCode } from '../../lib/record-code.js';
import { assertReferenceFields } from '../reference-data/reference.service.js';
import { metaDto, notFound, openStatusCondition, versionConflict } from './record-support.js';

type WorkItemRow = typeof workItems.$inferSelect;
const ENTITY = 'Work item';

export function toWorkItemDto(row: WorkItemRow): WorkItem {
  return {
    ...metaDto(row),
    phaseId: row.phaseId,
    workstream: row.workstream,
    title: row.title,
    description: row.description,
    ownerName: row.ownerName,
    plannedStart: row.plannedStart,
    plannedEnd: row.plannedEnd,
    actualStart: row.actualStart,
    actualEnd: row.actualEnd,
    percentComplete: row.percentComplete,
    statusId: row.statusId,
    priorityId: row.priorityId,
    isMilestone: row.isMilestone,
    dependencyNote: row.dependencyNote,
    evidenceRef: row.evidenceRef,
    evidenceDocumentId: row.evidenceDocumentId,
    remarks: row.remarks,
  };
}

const refFields = (input: {
  phaseId: number | null;
  statusId: number | null;
  priorityId: number | null;
}) => ({
  phaseId: input.phaseId,
  statusId: input.statusId,
  priorityId: input.priorityId,
});

const SORTS = {
  code: workItems.code,
  title: workItems.title,
  plannedEnd: workItems.plannedEnd,
  percentComplete: workItems.percentComplete,
  updatedAt: workItems.updatedAt,
} as const;

export async function listWorkItems(projectId: string, query: WorkItemListQuery) {
  const conditions: (SQL | undefined)[] = [eq(workItems.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(workItems.code, pattern),
        ilike(workItems.title, pattern),
        ilike(workItems.workstream, pattern),
        ilike(workItems.ownerName, pattern),
        ilike(workItems.description, pattern),
      ),
    );
  }
  if (query.statusId) conditions.push(eq(workItems.statusId, query.statusId));
  if (query.phaseId) conditions.push(eq(workItems.phaseId, query.phaseId));
  if (query.priorityId) conditions.push(eq(workItems.priorityId, query.priorityId));
  if (query.milestone !== undefined) conditions.push(eq(workItems.isMilestone, query.milestone));
  if (query.open === true) conditions.push(openStatusCondition(workItems.statusId));
  if (query.open === false) conditions.push(sql`NOT ${openStatusCondition(workItems.statusId)}`);
  const where = and(...conditions);
  const direction = query.dir === 'asc' ? asc : desc;

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(workItems)
      .where(where)
      .orderBy(sql`${direction(SORTS[query.sort])} NULLS LAST`, asc(workItems.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(workItems).where(where),
  ]);
  return {
    items: rows.map(toWorkItemDto),
    meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0),
  };
}

async function findRow(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(workItems)
    .where(and(eq(workItems.projectId, projectId), eq(workItems.id, id)))
    .limit(1);
  return row;
}

export async function getWorkItem(projectId: string, id: string): Promise<WorkItemDetail> {
  const row = await findRow(projectId, id);
  if (!row) throw notFound(ENTITY);
  const linked = await db
    .select({
      id: requirements.id,
      code: requirements.code,
      title: sql<string>`left(${requirements.statement}, 160)`,
    })
    .from(requirementWorkItems)
    .innerJoin(requirements, eq(requirements.id, requirementWorkItems.requirementId))
    .where(
      and(eq(requirementWorkItems.projectId, projectId), eq(requirementWorkItems.workItemId, id)),
    )
    .orderBy(asc(requirements.code));
  return { ...toWorkItemDto(row), requirements: linked };
}

export async function createWorkItem(projectId: string, actorId: string, input: WorkItemCreate) {
  await assertReferenceFields(refFields(input));
  const row = await db.transaction(async (tx) => {
    const code = await allocateRecordCode(
      tx,
      projectId,
      'work-item',
      RECORD_CODE_PREFIXES.workItem,
    );
    const [inserted] = await tx
      .insert(workItems)
      .values({ ...input, projectId, code, createdBy: actorId, updatedBy: actorId })
      .returning();
    return inserted;
  });
  if (!row) throw new Error('Work item insert returned no row');
  return getWorkItem(projectId, row.id);
}

export async function updateWorkItem(
  projectId: string,
  id: string,
  actorId: string,
  input: WorkItemUpdate,
) {
  const current = await findRow(projectId, id);
  if (!current) throw notFound(ENTITY);
  await assertReferenceFields(refFields(input), refFields(current));
  const { version, ...fields } = input;
  const [row] = await db
    .update(workItems)
    .set({
      ...fields,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${workItems.version} + 1`,
    })
    .where(
      and(eq(workItems.projectId, projectId), eq(workItems.id, id), eq(workItems.version, version)),
    )
    .returning();
  if (!row) throw versionConflict('work item');
  return getWorkItem(projectId, id);
}

/** Requirement links are removed with the work item; other references block deletion (409). */
export async function deleteWorkItem(projectId: string, id: string) {
  const deleted = await db
    .delete(workItems)
    .where(and(eq(workItems.projectId, projectId), eq(workItems.id, id)))
    .returning({ id: workItems.id });
  if (deleted.length === 0) throw notFound(ENTITY);
}
