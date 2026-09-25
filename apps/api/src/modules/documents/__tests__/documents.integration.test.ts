import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@pmocore/database';
import type {
  DocumentDetail,
  Project,
  ProjectDocument,
  ReferenceDataResponse,
  RequirementDetail,
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

describe.skipIf(!hasTestDatabase)('Documents (integration)', () => {
  let agent: Agent;
  let project: Project;
  let refs: ReferenceDataResponse['values'];

  const ref = (category: string, code: string) => {
    const value = refs.find((v) => v.category === category && v.code === code);
    if (!value) throw new Error(`Missing reference ${category}/${code}`);
    return value.id;
  };
  const base = (p: Project = project) => `/api/projects/${p.id}`;
  const createDocument = (payload: Record<string, unknown>, p?: Project) =>
    withCsrf(agent.post(`${base(p)}/documents`)).send({
      title: 'Acceptance certificate',
      ...payload,
    });

  beforeEach(async () => {
    await resetData();
    await createUser();
    agent = await login(createApp());
    refs = body<ReferenceDataResponse>(await agent.get('/api/reference-data')).data.values;
    project = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code: 'BASC-CQMS', name: 'CQMS' }),
    ).data;
  });

  it('records metadata, an external link and one related record', async () => {
    const requirement = body<RequirementDetail>(
      await withCsrf(agent.post(`${base()}/requirements`)).send({
        statement: 'Show ticket number',
      }),
    ).data;
    const created = await createDocument({
      phaseId: ref('PROJECT_PHASE', 'ACCEPTANCE'),
      statusId: ref('STATUS', 'COMPLETED'),
      docVersion: '1.0',
      ownerName: 'PM',
      documentDate: '2026-10-12',
      linkUrl: 'https://drive.example.com/cert.pdf',
      relatedRequirementId: requirement.id,
    });
    expect(created.status).toBe(201);
    const doc = body<DocumentDetail>(created).data;
    expect(doc).toMatchObject({
      code: 'DOC-001',
      linkUrl: 'https://drive.example.com/cert.pdf',
      relatedRecord: { type: 'requirement', code: 'REQ-001' },
      attachmentCount: 0,
    });

    const updated = await withCsrf(agent.put(`${base()}/documents/${doc.id}`)).send({
      ...doc,
      docVersion: '1.1',
      relatedRequirementId: null,
    });
    expect(body<DocumentDetail>(updated).data).toMatchObject({
      docVersion: '1.1',
      relatedRecord: null,
      version: 2,
    });

    await createDocument({ title: 'Minutes 5 Oct', phaseId: ref('PROJECT_PHASE', 'UAT') });
    const titles = async (q: string) =>
      body<ProjectDocument[]>(await agent.get(`${base()}/documents?${q}`)).data.map((d) => d.title);
    expect(await titles('q=minutes')).toEqual(['Minutes 5 Oct']);
    expect(await titles(`phaseId=${ref('PROJECT_PHASE', 'ACCEPTANCE')}`)).toEqual([
      'Acceptance certificate',
    ]);
  });

  it('validates links, single related record, and project isolation', async () => {
    expect((await createDocument({ linkUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await createDocument({ linkUrl: 'ftp://example.com/x' })).status).toBe(400);
    expect((await createDocument({ title: '' })).status).toBe(400);

    const other = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code: 'OTHER', name: 'Other' }),
    ).data;
    const foreign = body<RequirementDetail>(
      await withCsrf(agent.post(`${base(other)}/requirements`)).send({ statement: 'Foreign' }),
    ).data;
    expect((await createDocument({ relatedRequirementId: foreign.id })).status).toBe(400);

    const doc = body<DocumentDetail>(await createDocument({})).data;
    await agent.get(`${base(other)}/documents/${doc.id}`).expect(404);
    await createUser('other@example.test');
    const intruder = await login(createApp(), 'other@example.test');
    await intruder.get(`${base()}/documents/${doc.id}`).expect(404);

    await withCsrf(agent.post(`${base()}/archive`)).expect(200);
    expect((await createDocument({})).status).toBe(409);
  });

  it('counts document attachments and soft-deletes them with the document', async () => {
    const doc = body<DocumentDetail>(await createDocument({})).data;
    const [user] = (await db.execute<{ id: string }>(sql`SELECT id FROM users LIMIT 1`)).rows;
    // Attachment rows are written by the PKG-2 attachment service; simulate one here.
    await db.execute(sql`
      INSERT INTO attachments (project_id, parent_type, parent_id, original_name, content_type,
        extension, size_bytes, sha256, storage_driver, storage_key, uploaded_by)
      VALUES (${project.id}, 'document', ${doc.id}, 'cert.pdf', 'application/pdf', 'pdf', 10, 'x',
        'local', ${`${project.id}/${doc.id}`}, ${user?.id})`);

    const detail = body<DocumentDetail>(await agent.get(`${base()}/documents/${doc.id}`)).data;
    expect(detail.attachmentCount).toBe(1);

    await withCsrf(agent.delete(`${base()}/documents/${doc.id}`)).expect(200);
    const rows = await db.execute<{ deleted: boolean }>(
      sql`SELECT deleted_at IS NOT NULL AS deleted FROM attachments`,
    );
    expect(rows.rows).toEqual([{ deleted: true }]);
    await agent.get(`${base()}/documents/${doc.id}`).expect(404);
  });
});
