/**
 * Private attachment content for the `postgres` storage driver (PMOCORE-DEPLOY-VERCEL).
 *
 * An object store inside PostgreSQL: file bytes are kept apart from every
 * business record (including `attachments` metadata) and are addressed only by
 * the server-generated storage key `<projectId>/<attachmentId>`. Content is
 * split into bounded chunks so reads stream with bounded memory. There is
 * deliberately no foreign key to `attachments`: as with object storage, the
 * content is written before its metadata row, and orphans are reported by the
 * purge command.
 */
import { sql } from 'drizzle-orm';
import { check, customType, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

/** Upper bound of one stored chunk (the driver writes 512 KiB chunks). */
export const ATTACHMENT_CHUNK_MAX_BYTES = 1_048_576;

export const attachmentContentChunks = pgTable(
  'attachment_content_chunks',
  {
    storageKey: text('storage_key').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    data: bytea('data').notNull(),
  },
  (t) => [
    primaryKey({ name: 'attachment_content_chunks_pkey', columns: [t.storageKey, t.chunkIndex] }),
    check(
      'attachment_content_chunks_key_format',
      sql`${t.storageKey} ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'`,
    ),
    check('attachment_content_chunks_index_range', sql`${t.chunkIndex} >= 0`),
    check(
      'attachment_content_chunks_size_range',
      sql`octet_length(${t.data}) BETWEEN 1 AND ${sql.raw(String(ATTACHMENT_CHUNK_MAX_BYTES))}`,
    ),
  ],
);
