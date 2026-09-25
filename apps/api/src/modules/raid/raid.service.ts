import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { activities, db, raidItems, releases, requirements } from '@pmocore/database';
import {
  RAID_CODE_PREFIXES,
  type RaidItem,
  type RaidItemCreate,
  type RaidItemDetail,
  type RaidItemListQuery,
  type RaidItemUpdate,
  type RecordRef,
} from '@pmocore/shared';
import { AppError } from '../../lib/app-error.js';
import { likePattern, pageOffset, paginationMeta } from '../../lib/pagination.js';
import { allocateRecordCode } from '../../lib/record-code.js';
import { todayInTimeZone } from '../../lib/today.js';
import {
  assertReferenceFields,
  findReferenceValue,
  getReferenceValues,
} from '../reference-data/reference.service.js';
import { daysOpen, isOverdue, openStatusSql, resolveClosedDate } from './raid-derived.js';

export type RaidRow = typeof raidItems.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

const notFound = () => new AppError(404, 'NOT_FOUND', 'RAID item not found');

async function semanticMap(): Promise<Map<number, string | null>> {
  return new Map((await getReferenceValues()).map((v) => [v.id, v.semantic]));
}

export function toRaidDto(
  row: RaidRow,
  semantics: Map<number, string | null>,
  today: string,
): RaidItem {
  const semantic = row.statusId ? (semantics.get(row.statusId) ?? null) : null;
  return {
    id: row.id,
    projectId: row.projectId,
    code: row.code,
    typeId: row.typeId,
    title: row.title,
    description: row.description,
    impact: row.impact,
    ownerName: row.ownerName,
    dateRaised: row.dateRaised,
    sourceActivityId: row.sourceActivityId,
    probabilityId: row.probabilityId,
    priorityId: row.priorityId,
    dueDate: row.dueDate,
    statusId: row.statusId,
    mitigation: row.mitigation,
    resolution: row.resolution,
    closedDate: row.closedDate,
    evidence: row.evidence,
    remarks: row.remarks,
    requirementId: row.requirementId,
    releaseId: row.releaseId,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    version: row.version,
    overdue: isOverdue(row.dueDate, semantic, today),
    daysOpen: daysOpen(row.dateRaised, row.closedDate, today),
  };
}

async function statusSemantic(statusId: number | null) {
  return statusId ? ((await findReferenceValue(statusId))?.semantic ?? null) : null;
}

/** RAID code prefix is chosen by type at creation; retyping keeps the original code. */
async function codePrefixForType(typeId: number): Promise<string> {
  const type = await findReferenceValue(typeId);
  const prefix = type
    ? RAID_CODE_PREFIXES[type.code as keyof typeof RAID_CODE_PREFIXES]
    : undefined;
  return prefix ?? 'RAID';
}

/** Inserts RAID items inside an existing transaction (used by quick-add follow-ups). */
export async function insertRaidItems(
  tx: Tx,
  projectId: string,
  actorId: string,
  items: RaidItemCreate[],
): Promise<RaidRow[]> {
  const today = todayInTimeZone();
  const rows: RaidRow[] = [];
  for (const input of items) {
    const prefix = await codePrefixForType(input.typeId);
    const code = await allocateRecordCode(tx, projectId, `raid-${prefix}`, prefix);
    const closedDate = resolveClosedDate(
      await statusSemantic(input.statusId),
      input.closedDate,
      input.dateRaised,
      today,
    );
    const [row] = await tx
      .insert(raidItems)
      .values({
        ...input,
        closedDate,
        projectId,
        code,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    if (!row) throw new Error('RAID insert returned no row');
    rows.push(row);
  }
  return rows;
}

function referenceFields(input: {
  typeId: number;
  probabilityId: number | null;
  priorityId: number | null;
  statusId: number | null;
}) {
  return {
    typeId: input.typeId,
    probabilityId: input.probabilityId,
    priorityId: input.priorityId,
    statusId: input.statusId,
  };
}

const SORTS = {
  code: raidItems.code,
  dateRaised: raidItems.dateRaised,
  dueDate: raidItems.dueDate,
  updatedAt: raidItems.updatedAt,
  priority: sql`(SELECT rv.sort_order FROM reference_values rv WHERE rv.id = "raid_items"."priority_id")`,
} as const;

export async function listRaidItems(projectId: string, query: RaidItemListQuery) {
  const today = todayInTimeZone();
  const conditions: (SQL | undefined)[] = [eq(raidItems.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(raidItems.code, pattern),
        ilike(raidItems.title, pattern),
        ilike(raidItems.description, pattern),
        ilike(raidItems.ownerName, pattern),
      ),
    );
  }
  if (query.typeId) conditions.push(eq(raidItems.typeId, query.typeId));
  if (query.statusId) conditions.push(eq(raidItems.statusId, query.statusId));
  if (query.priorityId) conditions.push(eq(raidItems.priorityId, query.priorityId));
  if (query.sourceActivityId)
    conditions.push(eq(raidItems.sourceActivityId, query.sourceActivityId));
  if (query.owner) conditions.push(ilike(raidItems.ownerName, likePattern(query.owner)));
  if (query.open === true) conditions.push(openStatusSql(raidItems.statusId));
  if (query.open === false) conditions.push(sql`NOT ${openStatusSql(raidItems.statusId)}`);
  if (query.overdue === true) {
    conditions.push(sql`${raidItems.dueDate} < ${today}`, openStatusSql(raidItems.statusId));
  }
  const where = and(...conditions);
  const sortColumn = SORTS[query.sort];
  const direction = query.dir === 'asc' ? asc : desc;

  const [rows, [total], semantics] = await Promise.all([
    db
      .select()
      .from(raidItems)
      .where(where)
      .orderBy(sql`${direction(sortColumn)} NULLS LAST`, desc(raidItems.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(raidItems).where(where),
    semanticMap(),
  ]);

  return {
    items: rows.map((row) => toRaidDto(row, semantics, today)),
    meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0),
  };
}

async function findRaidRow(executor: Executor, projectId: string, id: string) {
  const [row] = await executor
    .select()
    .from(raidItems)
    .where(and(eq(raidItems.projectId, projectId), eq(raidItems.id, id)))
    .limit(1);
  return row;
}

async function recordRef(
  table: typeof activities | typeof requirements | typeof releases,
  projectId: string,
  id: string | null,
): Promise<RecordRef | null> {
  if (!id) return null;
  const title =
    table === activities
      ? activities.title
      : table === requirements
        ? sql<string>`left(${requirements.statement}, 160)`
        : releases.versionLabel;
  const [row] = await db
    .select({ id: table.id, code: table.code, title })
    .from(table)
    .where(and(eq(table.projectId, projectId), eq(table.id, id)))
    .limit(1);
  return row ? { id: row.id, code: row.code, title: String(row.title) } : null;
}

export async function getRaidItem(projectId: string, id: string): Promise<RaidItemDetail> {
  const row = await findRaidRow(db, projectId, id);
  if (!row) throw notFound();
  const [semantics, sourceActivity, requirement, release] = await Promise.all([
    semanticMap(),
    recordRef(activities, projectId, row.sourceActivityId),
    recordRef(requirements, projectId, row.requirementId),
    recordRef(releases, projectId, row.releaseId),
  ]);
  return {
    ...toRaidDto(row, semantics, todayInTimeZone()),
    sourceActivity,
    requirement,
    release,
  };
}

export async function createRaidItem(
  projectId: string,
  actorId: string,
  input: RaidItemCreate,
): Promise<RaidItemDetail> {
  await assertReferenceFields(referenceFields(input));
  const [row] = await db.transaction((tx) => insertRaidItems(tx, projectId, actorId, [input]));
  if (!row) throw new Error('RAID insert returned no row');
  return getRaidItem(projectId, row.id);
}

export async function updateRaidItem(
  projectId: string,
  id: string,
  actorId: string,
  input: RaidItemUpdate,
): Promise<RaidItemDetail> {
  const current = await findRaidRow(db, projectId, id);
  if (!current) throw notFound();
  await assertReferenceFields(referenceFields(input), referenceFields(current));

  const { version, ...fields } = input;
  const closedDate = resolveClosedDate(
    await statusSemantic(fields.statusId),
    fields.closedDate,
    fields.dateRaised,
    todayInTimeZone(),
  );
  const [row] = await db
    .update(raidItems)
    .set({
      ...fields,
      closedDate,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${raidItems.version} + 1`,
    })
    .where(
      and(eq(raidItems.projectId, projectId), eq(raidItems.id, id), eq(raidItems.version, version)),
    )
    .returning();
  if (!row) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'This item was changed elsewhere. Reload to see the latest version.',
    );
  }
  return getRaidItem(projectId, row.id);
}

/** Hard delete; references (e.g. a change-request requirement) block it with 409 RECORD_IN_USE. */
export async function deleteRaidItem(projectId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(raidItems)
    .where(and(eq(raidItems.projectId, projectId), eq(raidItems.id, id)))
    .returning({ id: raidItems.id });
  if (deleted.length === 0) throw notFound();
}
