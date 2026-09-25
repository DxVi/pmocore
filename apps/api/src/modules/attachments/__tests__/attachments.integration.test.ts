import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { db } from '@pmocore/database';
import {
  ATTACHMENT_MESSAGES,
  type ActivityDetail,
  type Attachment,
  type Project,
} from '@pmocore/shared';
import { createApp } from '../../../app.js';
import {
  type Agent,
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from '../../../__tests__/setup/helpers.js';
import { purgeDeletedAttachments } from '../attachments.service.js';
import { getAttachmentStorage, setAttachmentStorage } from '../storage/index.js';
import type { AttachmentStorage } from '../storage/storage.js';
import { FIXTURES } from './fixtures.js';

describe.skipIf(!hasTestDatabase)('attachments (integration)', () => {
  let agent: Agent;
  let project: Project;
  let activity: ActivityDetail;
  const base = () => `/api/projects/${project.id}`;

  const upload = (
    name: string,
    buffer: Buffer,
    options: { parentType?: string; parentId?: string; captureSource?: string; as?: Agent } = {},
  ) => {
    let req = withCsrf((options.as ?? agent).post(`${base()}/attachments`))
      .field('parentType', options.parentType ?? 'activity')
      .field('parentId', options.parentId ?? activity.id);
    if (options.captureSource) req = req.field('captureSource', options.captureSource);
    return req.attach('file', buffer, name);
  };

  const listFor = async (parentId = activity.id, parentType = 'activity') =>
    body<Attachment[]>(
      await agent.get(`${base()}/attachments?parentType=${parentType}&parentId=${parentId}`),
    ).data;

  const rowCount = async () =>
    (await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM attachments`)).rows[0]?.n;

  beforeEach(async () => {
    await resetData();
    // Keep the local test storage in step with the truncated database (no orphans).
    rmSync(resolve(process.env.ATTACHMENT_STORAGE_DIR ?? './.data/test-attachments'), {
      recursive: true,
      force: true,
    });
    await createUser();
    agent = await login(createApp());
    project = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code: 'BASC-CQMS', name: 'CQMS' }),
    ).data;
    activity = body<ActivityDetail>(
      await withCsrf(agent.post(`${base()}/activities`)).send({
        title: 'Registrar site visit',
        activityDate: '2026-10-05',
      }),
    ).data;
  });

  afterEach(() => {
    setAttachmentStorage(undefined);
    vi.restoreAllMocks();
  });

  it('accepts multiple attachments of every approved type on one meeting', async () => {
    const files: [string, Buffer][] = [
      ['site-photo.jpg', FIXTURES.jpg],
      ['screen.png', FIXTURES.png],
      ['gallery.webp', FIXTURES.webp],
      ['minutes.pdf', FIXTURES.pdf],
      ['minutes.docx', FIXTURES.docx],
      ['tracker.xlsx', FIXTURES.xlsx],
      ['legacy.doc', FIXTURES.ole],
      ['legacy.xls', FIXTURES.ole],
    ];
    for (const [name, buffer] of files) {
      const res = await upload(name, buffer, { captureSource: 'file' });
      expect(res.status, name).toBe(201);
    }
    const camera = await upload('image.jpg', FIXTURES.jpg, { captureSource: 'camera' });
    expect(body<Attachment>(camera).data).toMatchObject({
      contentType: 'image/jpeg',
      captureSource: 'camera',
      uploadedByName: 'Test PM',
      sizeBytes: FIXTURES.jpg.length,
    });

    const list = await listFor();
    expect(list).toHaveLength(9);
    expect(list.map((a) => a.originalName)).toContain('minutes.docx');
    const detail = body<ActivityDetail>(
      await agent.get(`${base()}/activities/${activity.id}`),
    ).data;
    expect(detail.attachmentCount).toBe(9);
  });

  it('rejects unsupported, mismatched, HEIC, empty and oversized files without side effects', async () => {
    const heic = await upload('IMG_0042.HEIC', FIXTURES.heic);
    expect(heic.status).toBe(415);
    expect(body(heic).error?.message).toBe(ATTACHMENT_MESSAGES.heic);

    expect((await upload('setup.exe', FIXTURES.zip)).status).toBe(415);
    expect((await upload('renamed.pdf', FIXTURES.png)).status).toBe(415);
    expect((await upload('empty.pdf', Buffer.alloc(0))).status).toBe(400);

    const oversized = Buffer.concat([FIXTURES.jpg, Buffer.alloc(10 * 1024 * 1024)]);
    const tooLarge = await upload('huge.jpg', oversized);
    expect(tooLarge.status).toBe(413);
    expect(body(tooLarge).error?.code).toBe('FILE_TOO_LARGE');

    const exactly = Buffer.concat([
      FIXTURES.jpg,
      Buffer.alloc(10 * 1024 * 1024 - FIXTURES.jpg.length),
    ]);
    expect((await upload('max.jpg', exactly)).status).toBe(201);

    expect(await rowCount()).toBe(1);
    const detail = body<ActivityDetail>(
      await agent.get(`${base()}/activities/${activity.id}`),
    ).data;
    expect(detail.version).toBe(activity.version);
  });

  it('validates the upload request and the parent record', async () => {
    const noFile = await withCsrf(agent.post(`${base()}/attachments`))
      .field('parentType', 'activity')
      .field('parentId', activity.id);
    expect(noFile.status).toBe(400);

    expect((await upload('a.pdf', FIXTURES.pdf, { parentType: 'requirement' })).status).toBe(400);
    expect(
      (await upload('a.pdf', FIXTURES.pdf, { parentId: '00000000-0000-4000-8000-000000000000' }))
        .status,
    ).toBe(404);

    const other = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code: 'OTHER', name: 'Other' }),
    ).data;
    const crossProject = await withCsrf(agent.post(`/api/projects/${other.id}/attachments`))
      .field('parentType', 'activity')
      .field('parentId', activity.id)
      .attach('file', FIXTURES.pdf, 'a.pdf');
    expect(crossProject.status).toBe(404);

    const twoFiles = await withCsrf(agent.post(`${base()}/attachments`))
      .field('parentType', 'activity')
      .field('parentId', activity.id)
      .attach('file', FIXTURES.pdf, 'a.pdf')
      .attach('file', FIXTURES.pdf, 'b.pdf');
    expect(twoFiles.status).toBe(400);

    const traversal = body<Attachment>(await upload('../../etc/passwd.pdf', FIXTURES.pdf)).data;
    expect(traversal.originalName).toBe('passwd.pdf');
    const [row] = (
      await db.execute<{ storage_key: string }>(
        sql`SELECT storage_key FROM attachments WHERE id = ${traversal.id}`,
      )
    ).rows;
    expect(row?.storage_key).toBe(`${project.id}/${traversal.id}`);
  });

  it('is reusable by document records (REQ-061)', async () => {
    const [user] = (await db.execute<{ id: string }>(sql`SELECT id FROM users LIMIT 1`)).rows;
    const [document] = (
      await db.execute<{ id: string }>(sql`
        INSERT INTO documents (project_id, code, title, created_by, updated_by)
        VALUES (${project.id}, 'DOC-001', 'Acceptance certificate', ${user?.id}, ${user?.id})
        RETURNING id`)
    ).rows;
    const res = await upload('certificate.pdf', FIXTURES.pdf, {
      parentType: 'document',
      parentId: document?.id,
    });
    expect(res.status).toBe(201);
    expect(await listFor(document?.id, 'document')).toHaveLength(1);
  });

  it('serves content only to authorized users, with safe headers', async () => {
    const pdf = body<Attachment>(await upload('Minutes – Oct.pdf', FIXTURES.pdf)).data;
    const docx = body<Attachment>(await upload('minutes.docx', FIXTURES.docx)).data;
    const photo = body<Attachment>(await upload('photo.jpg', FIXTURES.jpg)).data;

    const inlinePdf = await agent.get(pdf.contentUrl).buffer(true);
    expect(inlinePdf.status).toBe(200);
    expect(inlinePdf.headers['content-type']).toBe('application/pdf');
    expect(inlinePdf.headers['content-disposition']).toMatch(
      /^inline; filename="Minutes _ Oct.pdf"/,
    );
    expect(inlinePdf.headers['content-disposition']).toContain(
      `filename*=UTF-8''${encodeURIComponent('Minutes – Oct.pdf')}`,
    );
    expect(inlinePdf.headers['cache-control']).toBe('private, no-store');
    expect(inlinePdf.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(inlinePdf.body as Buffer).equals(FIXTURES.pdf)).toBe(true);

    const officeFile = await agent.get(docx.contentUrl);
    expect(officeFile.headers['content-disposition']).toMatch(/^attachment;/);

    const image = await agent.get(photo.contentUrl);
    expect(image.headers['content-disposition']).toMatch(/^inline;/);
    expect(image.headers['content-security-policy']).toContain("default-src 'none'");
    const download = await agent.get(`${photo.contentUrl}?download=1`);
    expect(download.headers['content-disposition']).toMatch(/^attachment;/);

    expect((await request(createApp()).get(pdf.contentUrl)).status).toBe(401);
    await createUser('other@example.test');
    const intruder = await login(createApp(), 'other@example.test');
    expect((await intruder.get(pdf.contentUrl)).status).toBe(404);
    expect(
      (await intruder.get(`${base()}/attachments?parentType=activity&parentId=${activity.id}`))
        .status,
    ).toBe(404);
    expect((await upload('x.pdf', FIXTURES.pdf, { as: intruder })).status).toBe(404);
  });

  it('removes attachments immediately, keeps metadata, and purges storage after retention', async () => {
    const kept = body<Attachment>(await upload('kept.jpg', FIXTURES.jpg)).data;
    const removed = body<Attachment>(await upload('removed.jpg', FIXTURES.jpg)).data;

    await withCsrf(agent.delete(`${base()}/attachments/${removed.id}`)).expect(200);
    expect((await listFor()).map((a) => a.id)).toEqual([kept.id]);
    expect((await agent.get(removed.contentUrl)).status).toBe(404);
    expect((await withCsrf(agent.delete(`${base()}/attachments/${removed.id}`))).status).toBe(404);
    expect(await rowCount()).toBe(2);

    const storage = getAttachmentStorage();
    const key = `${project.id}/${removed.id}`;
    expect((await purgeDeletedAttachments(30)).purged).toBe(0);
    await storage.openRead(key).then((s) => s.destroy());

    const result = await purgeDeletedAttachments(0, new Date(Date.now() + 1000));
    expect(result.purged).toBe(1);
    await expect(storage.openRead(key)).rejects.toThrow();
    await storage.openRead(`${project.id}/${kept.id}`).then((s) => s.destroy());
  });

  it('never leaves partial state when storage or the database fails', async () => {
    const real = getAttachmentStorage();
    const failing: AttachmentStorage = {
      driver: 'local',
      put: () => Promise.reject(new Error('storage unavailable')),
      openRead: (key) => real.openRead(key),
      delete: (key) => real.delete(key),
    };
    setAttachmentStorage(failing);
    const storageDown = await upload('photo.jpg', FIXTURES.jpg);
    expect(storageDown.status).toBe(500);
    expect(await rowCount()).toBe(0);

    const deleted: string[] = [];
    setAttachmentStorage({
      driver: 'local',
      put: (key, data, type) => real.put(key, data, type),
      openRead: (key) => real.openRead(key),
      delete: (key) => {
        deleted.push(key);
        return real.delete(key);
      },
    });
    vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('database unavailable'));
    const dbDown = await upload('photo.jpg', FIXTURES.jpg);
    expect(dbDown.status).toBe(500);
    expect(await rowCount()).toBe(0);
    expect(deleted).toHaveLength(1);
    await expect(real.openRead(deleted[0] ?? '')).rejects.toThrow();

    const detail = body<ActivityDetail>(
      await agent.get(`${base()}/activities/${activity.id}`),
    ).data;
    expect(detail).toMatchObject({ version: 1, attachmentCount: 0 });
  });

  it('keeps archived projects read-only while attachments remain viewable', async () => {
    const photo = body<Attachment>(await upload('photo.jpg', FIXTURES.jpg)).data;
    await withCsrf(agent.post(`${base()}/archive`)).expect(200);
    expect((await upload('late.jpg', FIXTURES.jpg)).status).toBe(409);
    expect((await withCsrf(agent.delete(`${base()}/attachments/${photo.id}`))).status).toBe(409);
    expect((await agent.get(photo.contentUrl)).status).toBe(200);
  });

  it('soft-deletes attachments when their meeting is deleted', async () => {
    await upload('photo.jpg', FIXTURES.jpg);
    await withCsrf(agent.delete(`${base()}/activities/${activity.id}`)).expect(200);
    const rows = await db.execute<{ deleted: boolean }>(
      sql`SELECT deleted_at IS NOT NULL AS deleted FROM attachments`,
    );
    expect(rows.rows).toEqual([{ deleted: true }]);
  });
});
