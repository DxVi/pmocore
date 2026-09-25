import { and, asc, count, desc, eq, ilike, notInArray, or, sql, type SQL } from 'drizzle-orm';
import {
  acceptances,
  db,
  defects,
  releaseDefects,
  releaseRequirements,
  releases,
  requirements,
} from '@pmocore/database';
import {
  RECORD_CODE_PREFIXES,
  type Acceptance,
  type AcceptanceCreate,
  type AcceptanceUpdate,
  type Release,
  type ReleaseCreate,
  type ReleaseDefectsScope,
  type ReleaseDetail,
  type ReleaseListQuery,
  type ReleaseRequirementsScope,
  type ReleaseUpdate,
} from '@pmocore/shared';
import { likePattern, pageOffset, paginationMeta } from '../../lib/pagination.js';
import { allocateRecordCode } from '../../lib/record-code.js';
import { assertReferenceFields } from '../reference-data/reference.service.js';
import {
  metaDto,
  notFound,
  uniqueBy,
  versionConflict,
  type Tx,
} from '../work-items/record-support.js';

/**
 * Releases & Acceptance (REQ-054–058, 072–073). Inclusion history lives in
 * release_requirements / release_defects (a requirement or defect may appear in
 * several releases); target release / fix version are separate planning fields.
 * Acceptances are 1:N per release, newest first.
 */
type ReleaseRow = typeof releases.$inferSelect;
type AcceptanceRow = typeof acceptances.$inferSelect;

export function toReleaseDto(row: ReleaseRow): Release {
  return {
    ...metaDto(row),
    versionLabel: row.versionLabel,
    name: row.name,
    plannedDate: row.plannedDate,
    releaseDate: row.releaseDate,
    environmentId: row.environmentId,
    scope: row.scope,
    deploymentStatusId: row.deploymentStatusId,
    demoDate: row.demoDate,
    uatDate: row.uatDate,
    uatResultId: row.uatResultId,
    deliveryDate: row.deliveryDate,
    trainingDate: row.trainingDate,
    remarks: row.remarks,
  };
}

export function toAcceptanceDto(row: AcceptanceRow): Acceptance {
  return {
    ...metaDto(row),
    releaseId: row.releaseId,
    statusId: row.statusId,
    acceptanceDate: row.acceptanceDate,
    acceptedBy: row.acceptedBy,
    certificateRef: row.certificateRef,
    certificateDocumentId: row.certificateDocumentId,
    handoverNotes: row.handoverNotes,
    remarks: row.remarks,
  };
}

const releaseRefFields = (i: {
  environmentId: number | null;
  deploymentStatusId: number | null;
  uatResultId: number | null;
}) => ({
  environmentId: i.environmentId,
  deploymentStatusId: i.deploymentStatusId,
  uatResultId: i.uatResultId,
});

const SORTS = {
  code: releases.code,
  versionLabel: releases.versionLabel,
  releaseDate: releases.releaseDate,
  updatedAt: releases.updatedAt,
} as const;

export async function listReleases(projectId: string, query: ReleaseListQuery) {
  const conditions: (SQL | undefined)[] = [eq(releases.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(releases.code, pattern),
        ilike(releases.versionLabel, pattern),
        ilike(releases.name, pattern),
        ilike(releases.scope, pattern),
      ),
    );
  }
  if (query.environmentId) conditions.push(eq(releases.environmentId, query.environmentId));
  if (query.deploymentStatusId)
    conditions.push(eq(releases.deploymentStatusId, query.deploymentStatusId));
  const where = and(...conditions);
  const direction = query.dir === 'asc' ? asc : desc;
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(releases)
      .where(where)
      .orderBy(sql`${direction(SORTS[query.sort])} NULLS LAST`, desc(releases.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(releases).where(where),
  ]);
  return {
    items: rows.map(toReleaseDto),
    meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0),
  };
}

async function findRelease(executor: typeof db | Tx, projectId: string, id: string) {
  const [row] = await executor
    .select()
    .from(releases)
    .where(and(eq(releases.projectId, projectId), eq(releases.id, id)))
    .limit(1);
  return row;
}

export async function getRelease(projectId: string, id: string): Promise<ReleaseDetail> {
  const row = await findRelease(db, projectId, id);
  if (!row) throw notFound('Release');
  const [includedRequirements, includedDefects, acceptanceRows] = await Promise.all([
    db
      .select({
        id: requirements.id,
        code: requirements.code,
        title: sql<string>`left(${requirements.statement}, 160)`,
        note: releaseRequirements.note,
      })
      .from(releaseRequirements)
      .innerJoin(requirements, eq(requirements.id, releaseRequirements.requirementId))
      .where(
        and(eq(releaseRequirements.projectId, projectId), eq(releaseRequirements.releaseId, id)),
      )
      .orderBy(asc(requirements.code)),
    db
      .select({
        id: defects.id,
        code: defects.code,
        title: defects.title,
        note: releaseDefects.note,
      })
      .from(releaseDefects)
      .innerJoin(defects, eq(defects.id, releaseDefects.defectId))
      .where(and(eq(releaseDefects.projectId, projectId), eq(releaseDefects.releaseId, id)))
      .orderBy(asc(defects.code)),
    db
      .select()
      .from(acceptances)
      .where(and(eq(acceptances.projectId, projectId), eq(acceptances.releaseId, id)))
      .orderBy(desc(acceptances.createdAt), desc(acceptances.code)),
  ]);
  return {
    ...toReleaseDto(row),
    includedRequirements,
    includedDefects,
    acceptances: acceptanceRows.map(toAcceptanceDto),
  };
}

export async function createRelease(projectId: string, actorId: string, input: ReleaseCreate) {
  await assertReferenceFields(releaseRefFields(input));
  const row = await db.transaction(async (tx) => {
    const code = await allocateRecordCode(tx, projectId, 'release', RECORD_CODE_PREFIXES.release);
    const [inserted] = await tx
      .insert(releases)
      .values({ ...input, projectId, code, createdBy: actorId, updatedBy: actorId })
      .returning();
    return inserted;
  });
  if (!row) throw new Error('Release insert returned no row');
  return getRelease(projectId, row.id);
}

export async function updateRelease(
  projectId: string,
  id: string,
  actorId: string,
  input: ReleaseUpdate,
) {
  const current = await findRelease(db, projectId, id);
  if (!current) throw notFound('Release');
  await assertReferenceFields(releaseRefFields(input), releaseRefFields(current));
  const { version, ...fields } = input;
  const [row] = await db
    .update(releases)
    .set({
      ...fields,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${releases.version} + 1`,
    })
    .where(
      and(eq(releases.projectId, projectId), eq(releases.id, id), eq(releases.version, version)),
    )
    .returning();
  if (!row) throw versionConflict('release');
  return getRelease(projectId, id);
}

/**
 * Deleting a release removes its scope rows; releases with acceptance records,
 * or still referenced as a target/fix release, are protected (409 RECORD_IN_USE).
 */
export async function deleteRelease(projectId: string, id: string) {
  const deleted = await db
    .delete(releases)
    .where(and(eq(releases.projectId, projectId), eq(releases.id, id)))
    .returning({ id: releases.id });
  if (deleted.length === 0) throw notFound('Release');
}

async function lockRelease(tx: Tx, projectId: string, id: string) {
  const [row] = await tx
    .select({ id: releases.id })
    .from(releases)
    .where(and(eq(releases.projectId, projectId), eq(releases.id, id)))
    .limit(1)
    .for('update');
  if (!row) throw notFound('Release');
}

/** Replaces the requirements included in a release, keeping existing rows' history. */
export async function replaceReleaseRequirements(
  projectId: string,
  releaseId: string,
  actorId: string,
  scope: ReleaseRequirementsScope,
) {
  const items = uniqueBy(scope.items, (i) => i.requirementId.toLowerCase());
  await db.transaction(async (tx) => {
    await lockRelease(tx, projectId, releaseId);
    const keep = items.map((i) => i.requirementId.toLowerCase());
    await tx
      .delete(releaseRequirements)
      .where(
        and(
          eq(releaseRequirements.releaseId, releaseId),
          keep.length > 0 ? notInArray(releaseRequirements.requirementId, keep) : undefined,
        ),
      );
    for (const item of items) {
      await tx
        .insert(releaseRequirements)
        .values({
          projectId,
          releaseId,
          requirementId: item.requirementId,
          note: item.note,
          createdBy: actorId,
        })
        .onConflictDoUpdate({
          target: [releaseRequirements.releaseId, releaseRequirements.requirementId],
          set: { note: item.note },
        });
    }
    await tx
      .update(releases)
      .set({ updatedAt: new Date(), updatedBy: actorId })
      .where(eq(releases.id, releaseId));
  });
  return getRelease(projectId, releaseId);
}

/** Replaces the defects included (fixed) in a release, keeping existing rows' history. */
export async function replaceReleaseDefects(
  projectId: string,
  releaseId: string,
  actorId: string,
  scope: ReleaseDefectsScope,
) {
  const items = uniqueBy(scope.items, (i) => i.defectId.toLowerCase());
  await db.transaction(async (tx) => {
    await lockRelease(tx, projectId, releaseId);
    const keep = items.map((i) => i.defectId.toLowerCase());
    await tx
      .delete(releaseDefects)
      .where(
        and(
          eq(releaseDefects.releaseId, releaseId),
          keep.length > 0 ? notInArray(releaseDefects.defectId, keep) : undefined,
        ),
      );
    for (const item of items) {
      await tx
        .insert(releaseDefects)
        .values({
          projectId,
          releaseId,
          defectId: item.defectId,
          note: item.note,
          createdBy: actorId,
        })
        .onConflictDoUpdate({
          target: [releaseDefects.releaseId, releaseDefects.defectId],
          set: { note: item.note },
        });
    }
    await tx
      .update(releases)
      .set({ updatedAt: new Date(), updatedBy: actorId })
      .where(eq(releases.id, releaseId));
  });
  return getRelease(projectId, releaseId);
}

// ---------------------------------------------------------------------------
// Acceptances
// ---------------------------------------------------------------------------

export async function createAcceptance(
  projectId: string,
  releaseId: string,
  actorId: string,
  input: AcceptanceCreate,
): Promise<Acceptance> {
  await assertReferenceFields({ statusId: input.statusId });
  const row = await db.transaction(async (tx) => {
    const release = await findRelease(tx, projectId, releaseId);
    if (!release) throw notFound('Release');
    const code = await allocateRecordCode(
      tx,
      projectId,
      'acceptance',
      RECORD_CODE_PREFIXES.acceptance,
    );
    const [inserted] = await tx
      .insert(acceptances)
      .values({ ...input, projectId, releaseId, code, createdBy: actorId, updatedBy: actorId })
      .returning();
    await tx
      .update(releases)
      .set({ updatedAt: new Date(), updatedBy: actorId })
      .where(eq(releases.id, releaseId));
    return inserted;
  });
  if (!row) throw new Error('Acceptance insert returned no row');
  return toAcceptanceDto(row);
}

export async function updateAcceptance(
  projectId: string,
  id: string,
  actorId: string,
  input: AcceptanceUpdate,
): Promise<Acceptance> {
  const [current] = await db
    .select()
    .from(acceptances)
    .where(and(eq(acceptances.projectId, projectId), eq(acceptances.id, id)))
    .limit(1);
  if (!current) throw notFound('Acceptance');
  await assertReferenceFields({ statusId: input.statusId }, { statusId: current.statusId });
  const { version, ...fields } = input;
  const [row] = await db
    .update(acceptances)
    .set({
      ...fields,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${acceptances.version} + 1`,
    })
    .where(
      and(
        eq(acceptances.projectId, projectId),
        eq(acceptances.id, id),
        eq(acceptances.version, version),
      ),
    )
    .returning();
  if (!row) throw versionConflict('acceptance');
  return toAcceptanceDto(row);
}

export async function deleteAcceptance(projectId: string, id: string) {
  const deleted = await db
    .delete(acceptances)
    .where(and(eq(acceptances.projectId, projectId), eq(acceptances.id, id)))
    .returning({ id: acceptances.id });
  if (deleted.length === 0) throw notFound('Acceptance');
}
