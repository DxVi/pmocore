import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { and, asc, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { activities, attachments, db, documents, users } from '@pmocore/database';
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MESSAGES,
  type Attachment,
  type AttachmentParentType,
  type AttachmentUploadFields,
} from '@pmocore/shared';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { logger } from '../../lib/logger.js';
import { checkFile, sanitizeFileName } from './file-policy.js';
import { getAttachmentStorage } from './storage/index.js';
import { StorageObjectNotFoundError, StorageQuotaExceededError } from './storage/errors.js';
import { buildStorageKey } from './storage/storage.js';

type AttachmentRow = typeof attachments.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const MAX_UPLOAD_BYTES = Math.min(env.ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_BYTES);

/**
 * Parent record types that accept attachments. Adding a record type later means
 * adding a resolver here (and to the parent-type contract) — nothing else changes.
 */
const PARENTS = {
  activity: activities,
  document: documents,
} as const satisfies Record<AttachmentParentType, typeof activities | typeof documents>;

const notFound = () => new AppError(404, 'NOT_FOUND', 'Attachment not found');
const parentNotFound = () =>
  new AppError(404, 'NOT_FOUND', 'The record for this attachment was not found');

async function assertParent(
  executor: typeof db | Tx,
  projectId: string,
  parentType: AttachmentParentType,
  parentId: string,
) {
  const table = PARENTS[parentType];
  const [parent] = await executor
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.projectId, projectId), eq(table.id, parentId)))
    .limit(1);
  if (!parent) throw parentNotFound();
}

/** Record that the parent changed (last activity) without bumping its edit version. */
async function touchParent(
  tx: Tx,
  parentType: AttachmentParentType,
  parentId: string,
  actorId: string,
) {
  const table = PARENTS[parentType];
  await tx
    .update(table)
    .set({ updatedAt: new Date(), updatedBy: actorId })
    .where(eq(table.id, parentId));
}

function toDto(row: AttachmentRow, uploadedByName: string): Attachment {
  return {
    id: row.id,
    projectId: row.projectId,
    parentType: row.parentType,
    parentId: row.parentId,
    originalName: row.originalName,
    contentType: row.contentType,
    extension: row.extension,
    sizeBytes: row.sizeBytes,
    captureSource: row.captureSource,
    uploadedBy: row.uploadedBy,
    uploadedByName,
    uploadedAt: row.uploadedAt.toISOString(),
    contentUrl: `/api/projects/${row.projectId}/attachments/${row.id}/content`,
  };
}

const rejection = (reason: 'empty' | 'heic' | 'unsupported' | 'mismatch') => {
  switch (reason) {
    case 'empty':
      return new AppError(400, 'VALIDATION_ERROR', 'The selected file is empty.');
    case 'heic':
      return new AppError(415, 'UNSUPPORTED_FILE_TYPE', ATTACHMENT_MESSAGES.heic);
    case 'mismatch':
      return new AppError(
        415,
        'UNSUPPORTED_FILE_TYPE',
        "The file's contents do not match its type. Save it again as a supported format and retry.",
      );
    default:
      return new AppError(415, 'UNSUPPORTED_FILE_TYPE', ATTACHMENT_MESSAGES.unsupported);
  }
};

export type UploadedFile = { originalname: string; buffer: Buffer; size: number };

/**
 * Stores one validated file and records it (design §10.3/§10.4). Validation
 * happens before any storage write; the metadata row is only created after the
 * object is stored, and the object is removed again if recording fails — so a
 * rejected or failed upload never changes the parent record.
 */
export async function uploadAttachment(
  projectId: string,
  actor: { userId: string; displayName: string },
  fields: AttachmentUploadFields,
  file: UploadedFile | undefined,
): Promise<Attachment> {
  if (!file) throw new AppError(400, 'VALIDATION_ERROR', 'Choose a file to upload.');
  await assertParent(db, projectId, fields.parentType, fields.parentId);

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError(
      413,
      'FILE_TOO_LARGE',
      ATTACHMENT_MESSAGES.tooLarge((file.size / 1_048_576).toFixed(1)),
    );
  }
  const check = checkFile(file.originalname, file.buffer);
  if (!check.ok) throw rejection(check.reason);

  const id = randomUUID();
  const key = buildStorageKey(projectId, id);
  const storage = getAttachmentStorage();
  try {
    await storage.put(key, file.buffer, check.type.contentType);
  } catch (err) {
    if (err instanceof StorageQuotaExceededError) {
      logger.warn({ attachmentId: id }, 'Attachment storage quota reached');
      throw new AppError(
        507,
        'STORAGE_FULL',
        'Attachment storage is full. Remove unneeded files or ask the administrator to free space.',
      );
    }
    throw err;
  }

  try {
    const row = await db.transaction(async (tx) => {
      // Re-check inside the transaction: the parent may have been deleted meanwhile.
      await assertParent(tx, projectId, fields.parentType, fields.parentId);
      const [inserted] = await tx
        .insert(attachments)
        .values({
          id,
          projectId,
          parentType: fields.parentType,
          parentId: fields.parentId,
          originalName: sanitizeFileName(file.originalname, check.extension),
          contentType: check.type.contentType,
          extension: check.extension,
          sizeBytes: file.size,
          sha256: createHash('sha256').update(file.buffer).digest('hex'),
          storageDriver: storage.driver,
          storageKey: key,
          captureSource: fields.captureSource ?? null,
          uploadedBy: actor.userId,
        })
        .returning();
      await touchParent(tx, fields.parentType, fields.parentId, actor.userId);
      return inserted;
    });
    if (!row) throw new Error('Attachment insert returned no row');
    return toDto(row, actor.displayName);
  } catch (err) {
    await storage.delete(key).catch((cleanupErr: unknown) => {
      logger.error(
        { err: cleanupErr, attachmentId: id },
        'Failed to remove stored object after upload failure',
      );
    });
    throw err;
  }
}

export async function listAttachments(
  projectId: string,
  parentType: AttachmentParentType,
  parentId: string,
): Promise<Attachment[]> {
  await assertParent(db, projectId, parentType, parentId);
  const rows = await db
    .select({ attachment: attachments, uploadedByName: users.displayName })
    .from(attachments)
    .innerJoin(users, eq(users.id, attachments.uploadedBy))
    .where(
      and(
        eq(attachments.projectId, projectId),
        eq(attachments.parentType, parentType),
        eq(attachments.parentId, parentId),
        isNull(attachments.deletedAt),
      ),
    )
    .orderBy(asc(attachments.uploadedAt), asc(attachments.id));
  return rows.map((r) => toDto(r.attachment, r.uploadedByName));
}

async function findActive(projectId: string, id: string) {
  const [row] = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.projectId, projectId),
        eq(attachments.id, id),
        isNull(attachments.deletedAt),
      ),
    )
    .limit(1);
  return row;
}

export async function openAttachment(
  projectId: string,
  id: string,
): Promise<{ row: AttachmentRow; stream: Readable }> {
  const row = await findActive(projectId, id);
  if (!row) throw notFound();
  try {
    return { row, stream: await getAttachmentStorage().openRead(row.storageKey) };
  } catch (err) {
    if (err instanceof StorageObjectNotFoundError) {
      logger.error(
        { attachmentId: id },
        'Attachment metadata exists but the stored object is missing',
      );
      throw new AppError(404, 'NOT_FOUND', 'This file is no longer available');
    }
    throw err;
  }
}

/**
 * Removal (REQ-039): the attachment disappears and becomes unretrievable
 * immediately; the stored object is purged after the retention period.
 */
export async function removeAttachment(projectId: string, id: string, actorId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(attachments)
      .set({ deletedAt: new Date(), deletedBy: actorId })
      .where(
        and(
          eq(attachments.projectId, projectId),
          eq(attachments.id, id),
          isNull(attachments.deletedAt),
        ),
      )
      .returning();
    if (!row) throw notFound();
    await touchParent(tx, row.parentType, row.parentId, actorId);
  });
}

/**
 * Deletes stored objects of attachments removed more than `retentionDays` ago.
 * Only rows stored by the configured driver are purged, so running the command
 * with the wrong driver cannot mark files purged while their content remains.
 */
export async function purgeDeletedAttachments(
  retentionDays = env.ATTACHMENT_PURGE_DAYS,
  now = new Date(),
) {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const storage = getAttachmentStorage();
  const due = await db
    .select({ id: attachments.id, storageKey: attachments.storageKey })
    .from(attachments)
    .where(
      and(
        isNotNull(attachments.deletedAt),
        isNull(attachments.purgedAt),
        lt(attachments.deletedAt, cutoff),
        eq(attachments.storageDriver, storage.driver),
      ),
    );

  let purged = 0;
  const failed: string[] = [];
  for (const item of due) {
    try {
      await storage.delete(item.storageKey);
      await db.update(attachments).set({ purgedAt: new Date() }).where(eq(attachments.id, item.id));
      purged += 1;
    } catch (err) {
      logger.error({ err, attachmentId: item.id }, 'Attachment purge failed');
      failed.push(item.id);
    }
  }

  // Objects with no metadata row (e.g. a crash between storing and recording).
  const orphans: string[] = [];
  if (storage.list) {
    const known = new Set(
      (await db.select({ key: attachments.storageKey }).from(attachments)).map((r) => r.key),
    );
    for await (const key of storage.list('')) {
      if (!known.has(key)) orphans.push(key);
    }
  }

  return { purged, failed, orphans };
}
