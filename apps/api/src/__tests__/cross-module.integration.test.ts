import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type {
  ActivityDetail,
  Attachment,
  DocumentDetail,
  Project,
  RaidItemDetail,
  ReferenceDataResponse,
  ReleaseDetail,
  RequirementDetail,
  TestCaseDetail,
  DefectDetail,
  WorkItemDetail,
} from '@pmocore/shared';
import { createApp } from '../app.js';
import { FIXTURES } from '../modules/attachments/__tests__/fixtures.js';
import {
  type Agent,
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from './setup/helpers.js';

/**
 * Cross-module checks that need Packages 2 and 3 together (integration phase):
 * documents on the real attachment service, the full traceability chain, and
 * isolation / archived rules across every module.
 */
describe.skipIf(!hasTestDatabase)('cross-module integration', () => {
  let agent: Agent;
  let project: Project;
  let refs: ReferenceDataResponse['values'];

  const ref = (category: string, code: string) => {
    const value = refs.find((v) => v.category === category && v.code === code);
    if (!value) throw new Error(`Missing reference ${category}/${code}`);
    return value.id;
  };
  const base = () => `/api/projects/${project.id}`;
  const create = async <T>(path: string, payload: object) => {
    const res = await withCsrf(agent.post(`${base()}${path}`)).send(payload);
    expect(res.status, `${path}: ${JSON.stringify(res.body)}`).toBe(201);
    return body<T>(res).data;
  };

  beforeEach(async () => {
    await resetData();
    await createUser();
    agent = await login(createApp());
    refs = body<ReferenceDataResponse>(await agent.get('/api/reference-data')).data.values;
    project = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({
        code: 'BASC-QMS',
        name: 'Queueing System',
      }),
    ).data;
  });

  it('completes the first operational workflow end to end (G2)', async () => {
    // Login is performed in beforeEach with a fresh session; create the rest here.
    const meeting = await create<ActivityDetail>('/activities', {
      title: 'Registrar site visit',
      activityDate: '2026-10-05',
      activityTypeId: ref('ACTIVITY_TYPE', 'SITE_VISIT'),
      findings: 'Display font too small',
    });
    const [action] = body<RaidItemDetail[]>(
      await withCsrf(agent.post(`${base()}/activities/${meeting.id}/actions`)).send({
        actions: [{ title: 'Send revised mock-up', ownerName: 'PM', dueDate: '2026-10-09' }],
      }),
    ).data;
    const photo = await withCsrf(agent.post(`${base()}/attachments`))
      .field('parentType', 'activity')
      .field('parentId', meeting.id)
      .field('captureSource', 'camera')
      .attach('file', FIXTURES.jpg, 'image.jpg');
    expect(photo.status).toBe(201);

    // Retrieve everything from a brand-new session (e.g. another device).
    const second = await login(createApp());
    const saved = body<ActivityDetail>(await second.get(`${base()}/activities/${meeting.id}`)).data;
    expect(saved).toMatchObject({
      code: 'MV-001',
      findings: 'Display font too small',
      attachmentCount: 1,
      followUps: [expect.objectContaining({ id: action?.id, code: 'ACT-001' })],
    });
    const files = body<Attachment[]>(
      await second.get(`${base()}/attachments?parentType=activity&parentId=${meeting.id}`),
    ).data;
    expect(files).toEqual([
      expect.objectContaining({ captureSource: 'camera', contentType: 'image/jpeg' }),
    ]);
    const image = await second.get(files[0]?.contentUrl ?? '');
    expect(image.status).toBe(200);
    expect(Buffer.from(image.body as Buffer).equals(FIXTURES.jpg)).toBe(true);
  });

  it('stores document files through the real attachment service (REQ-061)', async () => {
    const doc = await create<DocumentDetail>('/documents', { title: 'UAT sign-off' });
    const upload = await withCsrf(agent.post(`${base()}/attachments`))
      .field('parentType', 'document')
      .field('parentId', doc.id)
      .attach('file', FIXTURES.pdf, 'uat-signoff.pdf');
    expect(upload.status).toBe(201);
    const attachment = body<Attachment>(upload).data;

    const detail = body<DocumentDetail>(await agent.get(`${base()}/documents/${doc.id}`)).data;
    expect(detail.attachmentCount).toBe(1);
    const content = await agent.get(attachment.contentUrl);
    expect(content.status).toBe(200);
    expect(content.headers['content-type']).toBe('application/pdf');

    await withCsrf(agent.delete(`${base()}/documents/${doc.id}`)).expect(200);
    expect((await agent.get(attachment.contentUrl)).status).toBe(404);
  });

  it('links every module into one traceable chain', async () => {
    const workItem = await create<WorkItemDetail>('/work-items', {
      title: 'Queue display',
      isMilestone: true,
    });
    const requirement = await create<RequirementDetail>('/requirements', {
      statement: 'Display shows the ticket number',
    });
    await withCsrf(agent.put(`${base()}/requirements/${requirement.id}/work-items`))
      .send({ workItemIds: [workItem.id] })
      .expect(200);

    const meeting = await create<ActivityDetail>('/activities', {
      title: 'Registrar site visit',
      activityDate: '2026-10-05',
      activityTypeId: ref('ACTIVITY_TYPE', 'SITE_VISIT'),
      relatedRequirementId: requirement.id,
    });
    const [action] = body<RaidItemDetail[]>(
      await withCsrf(agent.post(`${base()}/activities/${meeting.id}/actions`)).send({
        actions: [{ title: 'Increase font size' }],
      }),
    ).data;
    expect(action?.requirementId).toBe(requirement.id);

    const test = await create<TestCaseDetail>('/tests', {
      scenario: 'Readable at 10 m',
      requirementId: requirement.id,
      resultId: ref('TEST_RESULT', 'FAILED'),
    });
    const defect = await create<DefectDetail>('/defects', {
      title: 'Font too small',
      testCaseId: test.id,
    });
    const release = await create<ReleaseDetail>('/releases', { versionLabel: 'v1.0' });
    await withCsrf(agent.put(`${base()}/releases/${release.id}/requirements`))
      .send({ items: [{ requirementId: requirement.id }] })
      .expect(200);
    await withCsrf(agent.put(`${base()}/releases/${release.id}/defects`))
      .send({ items: [{ defectId: defect.id }] })
      .expect(200);
    await create(`/releases/${release.id}/acceptances`, { statusId: ref('STATUS', 'ACCEPTED') });
    await withCsrf(agent.put(`${base()}/raid-items/${action?.id}`))
      .send({ ...action, releaseId: release.id })
      .expect(200);

    const trace = body<RequirementDetail>(
      await agent.get(`${base()}/requirements/${requirement.id}`),
    ).data;
    expect(trace.workItems.map((w) => w.code)).toEqual(['WI-001']);
    expect(trace.tests.map((t) => t.code)).toEqual(['TC-001']);
    expect(trace.defects.map((d) => d.code)).toEqual(['DEF-001']);
    expect(trace.releasedIn).toEqual([
      expect.objectContaining({ code: 'REL-001', acceptanceStatusId: ref('STATUS', 'ACCEPTED') }),
    ]);

    const raid = body<RaidItemDetail>(await agent.get(`${base()}/raid-items/${action?.id}`)).data;
    expect(raid).toMatchObject({
      sourceActivity: { code: 'MV-001' },
      requirement: { code: 'REQ-001' },
      release: { code: 'REL-001' },
    });

    // Referenced records are protected from deletion across modules.
    expect((await withCsrf(agent.delete(`${base()}/requirements/${requirement.id}`))).status).toBe(
      409,
    );
    expect((await withCsrf(agent.delete(`${base()}/activities/${meeting.id}`))).status).toBe(409);
  });

  it('isolates every module by project and blocks writes on archived projects', async () => {
    const modules = [
      'work-items',
      'requirements',
      'activities',
      'raid-items',
      'tests',
      'defects',
      'releases',
      'documents',
    ];
    await createUser('other@example.test');
    const intruder = await login(createApp(), 'other@example.test');
    for (const module of modules) {
      expect((await intruder.get(`${base()}/${module}`)).status, module).toBe(404);
      expect((await request(createApp()).get(`${base()}/${module}`)).status, module).toBe(401);
    }

    await withCsrf(agent.post(`${base()}/archive`)).expect(200);
    for (const module of modules) {
      const res = await withCsrf(agent.post(`${base()}/${module}`)).send({});
      expect(res.status, module).toBe(409);
      expect(body(res).error?.code).toBe('PROJECT_ARCHIVED');
      expect((await agent.get(`${base()}/${module}`)).status, module).toBe(200);
    }
  });
});
