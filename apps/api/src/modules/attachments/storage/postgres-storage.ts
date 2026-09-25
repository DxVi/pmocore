import { Readable } from 'node:stream';
import type { pool as databasePool } from '@pmocore/database';
import { assertStorageKey, type AttachmentStorage } from './storage.js';
import { StorageObjectNotFoundError, StorageQuotaExceededError } from './errors.js';

/** Stored chunk size: bounds memory per read to about one chunk. */
export const POSTGRES_CHUNK_BYTES = 512 * 1024;

// Serializes writers so the quota check and the insert see a consistent total.
const WRITE_LOCK = "hashtext('pmocore.attachment_content_chunks')";

export type PostgresStorageOptions = {
  /** Maximum total bytes of stored content (all attachments, including removed-but-not-purged). */
  quotaBytes: number;
  chunkBytes?: number;
};

/**
 * PostgreSQL driver (PMOCORE-DEPLOY-VERCEL) for free-tier staging without object
 * storage. Content lives only in the private `attachment_content_chunks` table,
 * never in business records, keyed by the server-generated storage key.
 * Writes are atomic (one transaction); reads fetch one chunk at a time.
 */
export class PostgresStorage implements AttachmentStorage {
  readonly driver = 'postgres' as const;
  private readonly chunkBytes: number;

  constructor(
    private readonly pool: typeof databasePool,
    private readonly options: PostgresStorageOptions,
  ) {
    this.chunkBytes = options.chunkBytes ?? POSTGRES_CHUNK_BYTES;
  }

  async put(key: string, data: Buffer): Promise<void> {
    assertStorageKey(key);
    if (data.length === 0) throw new Error('Refusing to store empty attachment content');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(${WRITE_LOCK})`);
      // Re-storing a key replaces it, so the total excludes its current content.
      const { rows } = await client.query<{ used: string }>(
        `SELECT coalesce(sum(octet_length(data)), 0)::bigint AS used
           FROM attachment_content_chunks WHERE storage_key <> $1`,
        [key],
      );
      if (Number(rows[0]?.used ?? 0) + data.length > this.options.quotaBytes) {
        throw new StorageQuotaExceededError();
      }
      await client.query('DELETE FROM attachment_content_chunks WHERE storage_key = $1', [key]);
      for (let index = 0, offset = 0; offset < data.length; index++, offset += this.chunkBytes) {
        await client.query(
          'INSERT INTO attachment_content_chunks (storage_key, chunk_index, data) VALUES ($1, $2, $3)',
          [key, index, data.subarray(offset, offset + this.chunkBytes)],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async openRead(key: string): Promise<Readable> {
    assertStorageKey(key);
    // Existence is checked before any response is started (missing -> clean 404).
    const { rows } = await this.pool.query<{ data: Buffer; chunks: number }>(
      `SELECT data,
              (SELECT count(*)::int FROM attachment_content_chunks WHERE storage_key = $1) AS chunks
         FROM attachment_content_chunks WHERE storage_key = $1 AND chunk_index = 0`,
      [key],
    );
    const first = rows[0];
    if (!first) throw new StorageObjectNotFoundError();

    const pool = this.pool;
    async function* chunks() {
      yield first.data;
      for (let index = 1; index < first.chunks; index++) {
        const next = await pool.query<{ data: Buffer }>(
          'SELECT data FROM attachment_content_chunks WHERE storage_key = $1 AND chunk_index = $2',
          [key, index],
        );
        const chunk = next.rows[0];
        // Removed while streaming (e.g. purged): fail the response rather than truncate silently.
        if (!chunk) throw new StorageObjectNotFoundError();
        yield chunk.data;
      }
    }
    return Readable.from(chunks(), { objectMode: false });
  }

  async delete(key: string): Promise<void> {
    assertStorageKey(key);
    await this.pool.query('DELETE FROM attachment_content_chunks WHERE storage_key = $1', [key]);
  }

  async *list(prefix = ''): AsyncIterable<string> {
    const { rows } = await this.pool.query<{ storage_key: string }>(
      `SELECT DISTINCT storage_key FROM attachment_content_chunks
        WHERE starts_with(storage_key, $1) ORDER BY storage_key`,
      [prefix],
    );
    for (const row of rows) yield row.storage_key;
  }

  /** Total stored bytes (for capacity monitoring). */
  async usedBytes(): Promise<number> {
    const { rows } = await this.pool.query<{ used: string }>(
      'SELECT coalesce(sum(octet_length(data)), 0)::bigint AS used FROM attachment_content_chunks',
    );
    return Number(rows[0]?.used ?? 0);
  }
}
