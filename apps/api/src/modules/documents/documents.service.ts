import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import { attachments, db, documents } from '@pmocore/database';
import {
  RECORD_CODE_PREFIXES,
  type DocumentCreate,
  type DocumentDetail,
  type DocumentListQuery,
  type DocumentUpdate,
  type ProjectDocument,
} from '@pmocore/shared';
import { likePattern, pageOffset, paginationMeta } from '../../lib/pagination.js';
import { allocateRecordCode } from '../../lib/record-code.js';
import { assertReferenceFields } from '../reference-data/reference.service.js';
import {
  metaDto,
  notFound,
  recordRef,
  versionConflict,
  type RefTable,
} from '../work-items/record-support.js';

/**
 * Basic project document tracking (REQ-059–061): metadata, external link, one
 * related record, and files through the shared attachment service
 * (parentType = 'document', implemented in PKG-2).
 */
type DocumentRow = typeof documents.$inferSelect;
const ENTITY = 'Document';

export function toDocumentDto(row: DocumentRow): ProjectDocument {
  return {
    ...metaDto(row),
    phaseId: row.phaseId,
    documentTypeId: row.documentTypeId,
    title: row.title,
    docVersion: row.docVersion,
    ownerName: row.ownerName,
    documentDate: row.documentDate,
    statusId: row.statusId,
    linkUrl: row.linkUrl,
    relatedRequirementId: row.relatedRequirementId,
    relatedActivityId: row.relatedActivityId,
    relatedReleaseId: row.relatedReleaseId,
    relatedWorkItemId: row.relatedWorkItemId,
    remarks: row.remarks,
  };
}

const refFields = (i: {
  phaseId: number | null;
  documentTypeId: number | null;
  statusId: number | null;
}) => ({
  phaseId: i.phaseId,
  documentTypeId: i.documentTypeId,
  statusId: i.statusId,
});

const SORTS = {
  code: documents.code,
  title: documents.title,
  documentDate: documents.documentDate,
  updatedAt: documents.updatedAt,
} as const;

export async function listDocuments(projectId: string, query: DocumentListQuery) {
  const conditions: (SQL | undefined)[] = [eq(documents.projectId, projectId)];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        ilike(documents.code, pattern),
        ilike(documents.title, pattern),
        ilike(documents.ownerName, pattern),
        ilike(documents.docVersion, pattern),
      ),
    );
  }
  if (query.phaseId) conditions.push(eq(documents.phaseId, query.phaseId));
  if (query.documentTypeId) conditions.push(eq(documents.documentTypeId, query.documentTypeId));
  if (query.statusId) conditions.push(eq(documents.statusId, query.statusId));
  const where = and(...conditions);
  const direction = query.dir === 'asc' ? asc : desc;
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(where)
      .orderBy(sql`${direction(SORTS[query.sort])} NULLS LAST`, asc(documents.code))
      .limit(query.pageSize)
      .offset(pageOffset(query.page, query.pageSize)),
    db.select({ value: count() }).from(documents).where(where),
  ]);
  return {
    items: rows.map(toDocumentDto),
    meta: paginationMeta(query.page, query.pageSize, total?.value ?? 0),
  };
}

async function findRow(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.id, id)))
    .limit(1);
  return row;
}

const RELATED: [
  keyof DocumentRow,
  RefTable,
  'requirement' | 'activity' | 'release' | 'workItem',
][] = [
  ['relatedRequirementId', 'requirements', 'requirement'],
  ['relatedActivityId', 'activities', 'activity'],
  ['relatedReleaseId', 'releases', 'release'],
  ['relatedWorkItemId', 'work_items', 'workItem'],
];

export async function getDocument(projectId: string, id: string): Promise<DocumentDetail> {
  const row = await findRow(projectId, id);
  if (!row) throw notFound(ENTITY);

  const related = RELATED.find(([field]) => row[field]);
  const relatedRef = related
    ? await recordRef(related[1], projectId, row[related[0]] as string)
    : null;
  const [attachmentTotal] = await db
    .select({ value: count() })
    .from(attachments)
    .where(
      and(
        eq(attachments.projectId, projectId),
        eq(attachments.parentType, 'document'),
        eq(attachments.parentId, id),
        isNull(attachments.deletedAt),
      ),
    );

  return {
    ...toDocumentDto(row),
    relatedRecord: related && relatedRef ? { ...relatedRef, type: related[2] } : null,
    attachmentCount: attachmentTotal?.value ?? 0,
  };
}

export async function createDocument(projectId: string, actorId: string, input: DocumentCreate) {
  await assertReferenceFields(refFields(input));
  const row = await db.transaction(async (tx) => {
    const code = await allocateRecordCode(tx, projectId, 'document', RECORD_CODE_PREFIXES.document);
    const [inserted] = await tx
      .insert(documents)
      .values({ ...input, projectId, code, createdBy: actorId, updatedBy: actorId })
      .returning();
    return inserted;
  });
  if (!row) throw new Error('Document insert returned no row');
  return getDocument(projectId, row.id);
}

export async function updateDocument(
  projectId: string,
  id: string,
  actorId: string,
  input: DocumentUpdate,
) {
  const current = await findRow(projectId, id);
  if (!current) throw notFound(ENTITY);
  await assertReferenceFields(refFields(input), refFields(current));
  const { version, ...fields } = input;
  const [row] = await db
    .update(documents)
    .set({
      ...fields,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${documents.version} + 1`,
    })
    .where(
      and(eq(documents.projectId, projectId), eq(documents.id, id), eq(documents.version, version)),
    )
    .returning();
  if (!row) throw versionConflict('document');
  return getDocument(projectId, id);
}

/**
 * Deletes a document and soft-deletes its attachments in one transaction.
 * Documents referenced as minutes, evidence or acceptance certificates are
 * protected (409 RECORD_IN_USE).
 */
export async function deleteDocument(projectId: string, id: string, actorId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(attachments)
      .set({ deletedAt: new Date(), deletedBy: actorId })
      .where(
        and(
          eq(attachments.projectId, projectId),
          eq(attachments.parentType, 'document'),
          eq(attachments.parentId, id),
          isNull(attachments.deletedAt),
        ),
      );
    const deleted = await tx
      .delete(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.id, id)))
      .returning({ id: documents.id });
    if (deleted.length === 0) throw notFound(ENTITY);
  });
}
