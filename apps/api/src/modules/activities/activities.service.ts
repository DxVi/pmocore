import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { activities, attachments, db, raidItems, requirements } from '@pmocore/database';
import {
  RECORD_CODE_PREFIXES,
  type Activity,
  type ActivityCreate,
  type ActivityDetail,
  type ActivityListItem,
  type ActivityListQuery,
  type ActivityUpdate,
  type FollowUpActionsRequest,
  type RaidItem,
} from '@pmocore/shared';
import { AppError } from '../../lib/app-error.js';
import { likePattern, pageOffset, paginationMeta } from '../../lib/pagination.js';
import { allocateRecordCode } from '../../lib/record-code.js';
import { todayInTimeZone } from '../../lib/today.js';
import {
  assertReferenceFields,
  findReferenceByCode,
  getReferenceValues,
} from '../reference-data/reference.service.js';
import { isOverdue, openStatusSql } from '../raid/raid-derived.js';
import { insertRaidItems, toRaidDto } from '../raid/raid.service.js';

export type ActivityRow = typeof activities.$inferSelect;

const notFound = () => new AppError(404, 'NOT_FOUND', 'Meeting / visit not found');

export function toActivityDto(row: ActivityRow): Activity {
  return {
    id: row.id,
    projectId: row.projectId,
    code: row.code,
    activityTypeId: row.activityTypeId,
    title: row.title,
    activityDate: row.activityDate,
    startTime: row.startTime,
    endTime: row.endTime,
    modeId: row.modeId,
    location: row.location,
    endUsers: row.endUsers,
    attendees: row.attendees,
    agenda: row.agenda,
    findings: row.findings,
    outcomes: row.outcomes,
    todoSummary: row.todoSummary,
    minutesRef: row.minutesRef,
    minutesDocumentId: row.minutesDocumentId,
    preparedByUserId: row.preparedByUserId,
    statusId: row.statusId,
    nextScheduleDate: row.nextScheduleDate,
    nextScheduleNote: row.nextScheduleNote,
    relatedRequirementId: row.relatedRequirementId,
    previousActivityId: row.previousActivityId,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

const referenceFields = (input: {
  activityTypeId: number | null;
  modeId: number | null;
  statusId: number | null;
}) => ({ activityTypeId: input.activityTypeId, modeId: input.modeId, statusId: input.statusId });

// Correlated subqueries reference the outer row explicitly: unqualified column names
// would bind to the inner table.
const outerActivity = sql.raw('"activities"');

const openActionCount = sql<number>`(
  SELECT count(*)::int FROM raid_items r
  WHERE r.project_id = ${outerActivity}.project_id AND r.source_activity_id = ${outerActivity}.id
    AND ${openStatusSql(sql`r.status_id`)})`;

const activeAttachmentCount = sql<number>`(
  SELECT count(*)::int FROM attachments a
  WHERE a.project_id = ${outerActivity}.project_id AND a.parent_type = 'activity'
    AND a.parent_id = ${outerActivity}.id AND a.deleted_at IS NULL)`;

const SORTS = {
  activityDate: activities.activityDate,
  code: activities.code,
  updatedAt: activities.updatedAt,
} as const;

export async function listActivities(projectId: string, query: ActivityListQuery) {
  const conditions: (SQL | undefined)[] = [eq(activities.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(activities.code, pattern),
        ilike(activities.title, pattern),
        ilike(activities.location, pattern),
        ilike(activities.attendees, pattern),
        ilike(activities.endUsers, pattern),
        ilike(activities.findings, pattern),
        ilike(activities.outcomes, pattern),
      ),
    );
  }
  if (query.activityTypeId) conditions.push(eq(activities.activityTypeId, query.activityTypeId));
  if (query.statusId) conditions.push(eq(activities.statusId, query.statusId));
  if (query.from) conditions.push(gte(activities.activityDate, query.from));
  if (query.to) conditions.push(lte(activities.activityDate, query.to));
  if (query.upcoming === true) {
    // The schedule: open activities dated today or later (dedicated calendar deferred, REQ-077).
    conditions.push(
      gte(activities.activityDate, todayInTimeZone()),
      openStatusSql(activities.statusId),
    );
  }
  const where = and(...conditions);
  const direction = query.dir === 'asc' ? asc : desc;

  const [rows, [total]] = await Promise.all([
    db
      .select({ activity: activities, openActionCount, attachmentCount: activeAttachmentCount })
      .from(activities)
      .where(where)
      .orderBy(direction(SORTS[query.sort]), direction(activities.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(activities).where(where),
  ]);

  const items: ActivityListItem[] = rows.map((row) => ({
    ...toActivityDto(row.activity),
    openActionCount: Number(row.openActionCount),
    attachmentCount: Number(row.attachmentCount),
  }));
  return { items, meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0) };
}

async function findActivityRow(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.projectId, projectId), eq(activities.id, id)))
    .limit(1);
  return row;
}

export async function getActivity(projectId: string, id: string): Promise<ActivityDetail> {
  const row = await findActivityRow(projectId, id);
  if (!row) throw notFound();

  const today = todayInTimeZone();
  const [followUpRows, [attachmentTotal], relatedRequirement, references] = await Promise.all([
    db
      .select()
      .from(raidItems)
      .where(and(eq(raidItems.projectId, projectId), eq(raidItems.sourceActivityId, id)))
      .orderBy(asc(raidItems.createdAt), asc(raidItems.code)),
    db
      .select({ value: count() })
      .from(attachments)
      .where(
        and(
          eq(attachments.projectId, projectId),
          eq(attachments.parentType, 'activity'),
          eq(attachments.parentId, id),
          isNull(attachments.deletedAt),
        ),
      ),
    row.relatedRequirementId
      ? db
          .select({
            id: requirements.id,
            code: requirements.code,
            title: sql<string>`left(${requirements.statement}, 160)`,
          })
          .from(requirements)
          .where(
            and(
              eq(requirements.projectId, projectId),
              eq(requirements.id, row.relatedRequirementId),
            ),
          )
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    getReferenceValues(),
  ]);

  const semantics = new Map(references.map((v) => [v.id, v.semantic]));
  return {
    ...toActivityDto(row),
    followUps: followUpRows.map((raid) => ({
      id: raid.id,
      code: raid.code,
      title: raid.title,
      typeId: raid.typeId,
      ownerName: raid.ownerName,
      dueDate: raid.dueDate,
      statusId: raid.statusId,
      overdue: isOverdue(
        raid.dueDate,
        raid.statusId ? (semantics.get(raid.statusId) ?? null) : null,
        today,
      ),
    })),
    relatedRequirement,
    attachmentCount: attachmentTotal?.value ?? 0,
  };
}

export async function createActivity(
  projectId: string,
  actorId: string,
  input: ActivityCreate,
): Promise<ActivityDetail> {
  await assertReferenceFields(referenceFields(input));
  const row = await db.transaction(async (tx) => {
    const code = await allocateRecordCode(tx, projectId, 'activity', RECORD_CODE_PREFIXES.activity);
    const [inserted] = await tx
      .insert(activities)
      .values({
        ...input,
        projectId,
        code,
        preparedByUserId: actorId,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    return inserted;
  });
  if (!row) throw new Error('Activity insert returned no row');
  return getActivity(projectId, row.id);
}

export async function updateActivity(
  projectId: string,
  id: string,
  actorId: string,
  input: ActivityUpdate,
): Promise<ActivityDetail> {
  const current = await findActivityRow(projectId, id);
  if (!current) throw notFound();
  await assertReferenceFields(referenceFields(input), referenceFields(current));

  const { version, ...fields } = input;
  const [row] = await db
    .update(activities)
    .set({
      ...fields,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${activities.version} + 1`,
    })
    .where(
      and(
        eq(activities.projectId, projectId),
        eq(activities.id, id),
        eq(activities.version, version),
      ),
    )
    .returning();
  if (!row) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'This meeting / visit was changed elsewhere. Reload to see the latest version.',
    );
  }
  return getActivity(projectId, id);
}

/**
 * Deletes a meeting/visit and soft-deletes its attachments in one transaction.
 * Blocked (409 RECORD_IN_USE) while follow-up RAID items or other records reference it.
 */
export async function deleteActivity(projectId: string, id: string, actorId: string) {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: activities.id })
      .from(activities)
      .where(and(eq(activities.projectId, projectId), eq(activities.id, id)))
      .limit(1);
    if (!existing) throw notFound();

    const [followUps] = await tx
      .select({ value: count() })
      .from(raidItems)
      .where(and(eq(raidItems.projectId, projectId), eq(raidItems.sourceActivityId, id)));
    if ((followUps?.value ?? 0) > 0) {
      throw new AppError(
        409,
        'RECORD_IN_USE',
        'This meeting / visit has follow-up items. Unlink or delete them first.',
      );
    }

    await tx
      .update(attachments)
      .set({ deletedAt: new Date(), deletedBy: actorId })
      .where(
        and(
          eq(attachments.projectId, projectId),
          eq(attachments.parentType, 'activity'),
          eq(attachments.parentId, id),
          isNull(attachments.deletedAt),
        ),
      );
    await tx
      .delete(activities)
      .where(and(eq(activities.projectId, projectId), eq(activities.id, id)));
  });
}

/**
 * Quick-add follow-ups (design §9.2/§9.3): creates real RAID items that inherit the
 * project, source activity, date raised and related requirement in one transaction.
 */
export async function addFollowUps(
  projectId: string,
  activityId: string,
  actorId: string,
  request: FollowUpActionsRequest,
): Promise<RaidItem[]> {
  const activity = await findActivityRow(projectId, activityId);
  if (!activity) throw notFound();

  const [actionType, defaultStatus] = await Promise.all([
    findReferenceByCode('RAID_TYPE', 'ACTION'),
    findReferenceByCode('STATUS', 'NOT_STARTED'),
  ]);
  if (!actionType) throw new Error('RAID_TYPE ACTION reference value is missing');

  const items = request.actions.map((action) => ({
    typeId: action.raidTypeId ?? actionType.id,
    title: action.title,
    description: null,
    impact: null,
    ownerName: action.ownerName,
    dateRaised: activity.activityDate,
    sourceActivityId: activity.id,
    probabilityId: null,
    priorityId: action.priorityId,
    dueDate: action.dueDate,
    statusId: defaultStatus?.id ?? null,
    mitigation: null,
    resolution: null,
    closedDate: null,
    evidence: null,
    remarks: `Raised in ${activity.code}: ${activity.title}`,
    requirementId: activity.relatedRequirementId,
    releaseId: null,
  }));
  for (const item of items) {
    await assertReferenceFields({ typeId: item.typeId, priorityId: item.priorityId });
  }

  const rows = await db.transaction(async (tx) => {
    const created = await insertRaidItems(tx, projectId, actorId, items);
    await tx
      .update(activities)
      .set({ updatedAt: new Date(), updatedBy: actorId })
      .where(eq(activities.id, activity.id));
    return created;
  });

  const semantics = new Map((await getReferenceValues()).map((v) => [v.id, v.semantic]));
  const today = todayInTimeZone();
  return rows.map((row) => toRaidDto(row, semantics, today));
}
