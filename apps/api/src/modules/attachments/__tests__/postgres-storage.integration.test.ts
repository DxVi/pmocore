import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, pool } from '@pmocore/database';
import type { ActivityDetail, Attachment, Project } from '@pmocore/shared';
import { createApp } from '../../../app.js';
import {
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from '../../../__tests__/setup/helpers.js';
import { purgeDeletedAttachments } from '../attachments.service.js';
import { setAttachmentStorage } from '../storage/index.js';
import { StorageObjectNotFoundError, StorageQuotaExceededError } from '../storage/errors.js';
import { POSTGRES_CHUNK_BYTES, PostgresStorage } from '../storage/postgres-storage.js';
import { FIXTURES } from './fixtures.js';

const MB = 1_048_576;
const newKey = (projectId = randomUUID()) => `${projectId}/${randomUUID()}`;

async function readAll(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return chunks;
}

const storedChunks = async (key: string) =>
  (
    await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM attachment_content_chunks WHERE storage_key = ${key}`,
    )
  ).rows[0]?.n;

describe.skipIf(!hasTestDatabase)('PostgreSQL attachment storage (integration)', () => {
  beforeEach(async () => {
    await resetData();
  });

  afterEach(() => {
    setAttachmentStorage(undefined);
  });

  it('stores content in bounded chunks and streams it back byte-for-byte', async () => {
    const storage = new PostgresStorage(pool, { quotaBytes: 64 * MB });
    const key = newKey();
    const data = Buffer.alloc(10 * MB);
    for (let i = 0; i < data.length; i += 4096) data.writeUInt32BE(i, i);

    await storage.put(key, data);
    expect(await storedChunks(key)).toBe(Math.ceil(data.length / POSTGRES_CHUNK_BYTES));

    const chunks = await readAll(await storage.openRead(key));
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(POSTGRES_CHUNK_BYTES);
    expect(Buffer.concat(chunks).equals(data)).toBe(true);
    expect(await storage.usedBytes()).toBe(data.length);
  });

  it('reports missing content, deletes idempotently and lists keys by prefix', async () => {
    const storage = new PostgresStorage(pool, { quotaBytes: MB, chunkBytes: 3 });
    const projectId = randomUUID();
    const [a, b, other] = [newKey(projectId), newKey(projectId), newKey()];
    for (const key of [a, b, other]) await storage.put(key, Buffer.from('content'));

    const listed: string[] = [];
    for await (const key of storage.list(`${projectId}/`)) listed.push(key);
    expect(listed).toEqual([a, b].sort());

    await storage.delete(a);
    await storage.delete(a);
    await expect(storage.openRead(a)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
    expect(Buffer.concat(await readAll(await storage.openRead(b))).toString()).toBe('content');
  });

  it('rejects keys that are not server-generated and empty content', async () => {
    const storage = new PostgresStorage(pool, { quotaBytes: MB });
    for (const key of ['../etc/passwd', 'a/b', `${randomUUID()}/../x`]) {
      await expect(storage.put(key, Buffer.from('x')), key).rejects.toThrow(/Invalid/);
      await expect(storage.openRead(key), key).rejects.toThrow(/Invalid/);
    }
    await expect(storage.put(newKey(), Buffer.alloc(0))).rejects.toThrow(/empty/);
  });

  it('enforces the capacity quota without storing anything', async () => {
    const storage = new PostgresStorage(pool, { quotaBytes: 10, chunkBytes: 4 });
    const kept = newKey();
    await storage.put(kept, Buffer.from('12345678'));
    const rejected = newKey();
    await expect(storage.put(rejected, Buffer.from('12345'))).rejects.toBeInstanceOf(
      StorageQuotaExceededError,
    );
    expect(await storedChunks(rejected)).toBe(0);
    // Replacing an existing object only counts its new size.
    await storage.put(kept, Buffer.from('0123456789'));
    expect(await storage.usedBytes()).toBe(10);
  });

  it('writes atomically: a failed write leaves no partial content', async () => {
    // A 2 MiB chunk violates the table's per-chunk size check after the first 1 MiB write.
    const storage = new PostgresStorage(pool, { quotaBytes: 64 * MB, chunkBytes: MB });
    const key = newKey();
    const failing = new PostgresStorage(pool, { quotaBytes: 64 * MB, chunkBytes: 2 * MB });
    await expect(failing.put(key, Buffer.alloc(3 * MB, 1))).rejects.toThrow();
    expect(await storedChunks(key)).toBe(0);
    await storage.put(key, Buffer.alloc(3 * MB, 1));
    expect(await storedChunks(key)).toBe(3);
  });

  it('fails the stream instead of truncating when content disappears mid-read', async () => {
    const storage = new PostgresStorage(pool, { quotaBytes: MB, chunkBytes: 2 });
    const key = newKey();
    await storage.put(key, Buffer.from('abcdef'));
    const stream = await storage.openRead(key);
    await storage.delete(key);
    await expect(readAll(stream)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });

  it('answers a full store with 507 and leaves the meeting unchanged', async () => {
    setAttachmentStorage(new PostgresStorage(pool, { quotaBytes: FIXTURES.jpg.length + 10 }));
    await createUser();
    const agent = await login(createApp());
    const project = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code: 'BASC-QUOTA', name: 'Quota' }),
    ).data;
    const base = `/api/projects/${project.id}`;
    const activity = body<ActivityDetail>(
      await withCsrf(agent.post(`${base}/activities`)).send({
        title: 'Site visit',
        activityDate: '2026-10-05',
      }),
    ).data;
    const upload = (name: string) =>
      withCsrf(agent.post(`${base}/attachments`))
        .field('parentType', 'activity')
        .field('parentId', activity.id)
        .attach('file', FIXTURES.jpg, name);

    const first = await upload('first.jpg');
    expect(first.status).toBe(201);
    expect(body<Attachment>(first).data.contentUrl).toContain(`${base}/attachments/`);
    const full = await upload('second.jpg');
    expect(full.status).toBe(507);
    expect(body(full).error?.code).toBe('STORAGE_FULL');

    const rows = await db.execute<{ driver: string }>(
      sql`SELECT storage_driver AS driver FROM attachments`,
    );
    expect(rows.rows).toEqual([{ driver: 'postgres' }]);
    const detail = body<ActivityDetail>(await agent.get(`${base}/activities/${activity.id}`)).data;
    expect(detail.attachmentCount).toBe(1);

    // A purge run with a different driver configured leaves these files alone.
    const removed = body<Attachment>(first).data;
    await withCsrf(agent.delete(`${base}/attachments/${removed.id}`)).expect(200);
    setAttachmentStorage(undefined); // local driver
    const later = new Date(Date.now() + 1000);
    expect((await purgeDeletedAttachments(0, later)).purged).toBe(0);
    const postgres = new PostgresStorage(pool, { quotaBytes: MB });
    setAttachmentStorage(postgres);
    expect(await storedChunks(`${project.id}/${removed.id}`)).toBe(1);
    expect((await purgeDeletedAttachments(0, later)).purged).toBe(1);
    expect(await storedChunks(`${project.id}/${removed.id}`)).toBe(0);
  });
});
