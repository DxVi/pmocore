import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Project,
  ReferenceDataResponse,
  Requirement,
  RequirementDetail,
  WorkItem,
  WorkItemDetail,
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

describe.skipIf(!hasTestDatabase)('Project Plan and Requirements (integration)', () => {
  let agent: Agent;
  let project: Project;
  let refs: ReferenceDataResponse['values'];

  const ref = (category: string, code: string) => {
    const value = refs.find((v) => v.category === category && v.code === code);
    if (!value) throw new Error(`Missing reference ${category}/${code}`);
    return value.id;
  };
  const base = (p: Project = project) => `/api/projects/${p.id}`;

  const createWorkItem = (overrides: Record<string, unknown> = {}, p?: Project) =>
    withCsrf(agent.post(`${base(p)}/work-items`)).send({
      title: 'Queue display module',
      workstream: 'Kiosk',
      phaseId: ref('PROJECT_PHASE', 'DEVELOPMENT'),
      statusId: ref('STATUS', 'IN_PROGRESS'),
      plannedStart: '2026-09-01',
      plannedEnd: '2026-10-10',
      percentComplete: 40,
      ...overrides,
    });

  const createRequirement = (overrides: Record<string, unknown> = {}, p?: Project) =>
    withCsrf(agent.post(`${base(p)}/requirements`)).send({
      statement: 'The queue display shows the current ticket number',
      acceptanceCriteria: 'Visible from 10 metres',
      priorityId: ref('PRIORITY', 'HIGH'),
      statusId: ref('STATUS', 'NOT_STARTED'),
      dateRaised: '2026-09-05',
      ...overrides,
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

  describe('work items', () => {
    it('creates, reads, updates, filters and deletes work items', async () => {
      const created = await createWorkItem({ isMilestone: true });
      expect(created.status).toBe(201);
      const item = body<WorkItemDetail>(created).data;
      expect(item).toMatchObject({
        code: 'WI-001',
        isMilestone: true,
        percentComplete: 40,
        requirements: [],
      });

      await createWorkItem({
        title: 'Training',
        statusId: ref('STATUS', 'COMPLETED'),
        percentComplete: 100,
      });

      const updated = await withCsrf(agent.put(`${base()}/work-items/${item.id}`)).send({
        ...item,
        percentComplete: 75,
        actualStart: '2026-09-02',
        ownerName: 'Dev team',
      });
      expect(updated.status).toBe(200);
      expect(body<WorkItemDetail>(updated).data).toMatchObject({ percentComplete: 75, version: 2 });

      const stale = await withCsrf(agent.put(`${base()}/work-items/${item.id}`)).send({ ...item });
      expect(stale.status).toBe(409);

      const titles = async (query: string) =>
        body<WorkItem[]>(await agent.get(`${base()}/work-items?${query}`)).data.map((w) => w.title);
      expect(await titles('milestone=true')).toEqual(['Queue display module']);
      expect(await titles('open=true')).toEqual(['Queue display module']);
      expect(await titles('q=training')).toEqual(['Training']);
      expect(await titles('sort=percentComplete&dir=desc')).toEqual([
        'Training',
        'Queue display module',
      ]);

      await withCsrf(agent.delete(`${base()}/work-items/${item.id}`)).expect(200);
      await agent.get(`${base()}/work-items/${item.id}`).expect(404);
    });

    it('validates percent, date order and reference categories', async () => {
      expect((await createWorkItem({ percentComplete: 120 })).status).toBe(400);
      expect(
        (await createWorkItem({ plannedStart: '2026-10-10', plannedEnd: '2026-09-01' })).status,
      ).toBe(400);
      expect((await createWorkItem({ title: '' })).status).toBe(400);
      expect((await createWorkItem({ phaseId: ref('STATUS', 'BLOCKED') })).status).toBe(400);
    });
  });

  describe('requirements', () => {
    it('creates, reads, updates and lists requirements with lifecycle status', async () => {
      const created = await createRequirement();
      expect(created.status).toBe(201);
      const requirement = body<RequirementDetail>(created).data;
      expect(requirement).toMatchObject({
        code: 'REQ-001',
        acceptanceCriteria: 'Visible from 10 metres',
        workItems: [],
        tests: [],
        defects: [],
        targetRelease: null,
        releasedIn: [],
      });

      await createRequirement({
        statement: 'Printed ticket shows time',
        statusId: ref('STATUS', 'ACCEPTED'),
      });
      await createRequirement({ statement: 'Deferred idea', statusId: ref('STATUS', 'DEFERRED') });

      const updated = await withCsrf(agent.put(`${base()}/requirements/${requirement.id}`)).send({
        ...requirement,
        statusId: ref('STATUS', 'FOR_REVIEW_VALIDATION'),
        isChangeRequest: true,
        validationEvidence: 'Demo on 2026-10-06',
      });
      expect(updated.status).toBe(200);
      expect(body<RequirementDetail>(updated).data).toMatchObject({
        isChangeRequest: true,
        version: 2,
      });

      const codes = async (query: string) =>
        body<Requirement[]>(await agent.get(`${base()}/requirements?${query}`)).data.map(
          (r) => r.code,
        );
      expect(await codes('open=true')).toEqual(['REQ-001']);
      expect(await codes('open=false&sort=code&dir=asc')).toEqual(['REQ-002', 'REQ-003']);
      expect(await codes('changeRequest=true')).toEqual(['REQ-001']);
      expect(await codes('q=printed')).toEqual(['REQ-002']);
    });

    it('links work items in both directions and replaces the link set atomically', async () => {
      const requirement = body<RequirementDetail>(await createRequirement()).data;
      const a = body<WorkItemDetail>(await createWorkItem({ title: 'Display' })).data;
      const b = body<WorkItemDetail>(await createWorkItem({ title: 'Printer' })).data;

      const linked = await withCsrf(
        agent.put(`${base()}/requirements/${requirement.id}/work-items`),
      ).send({
        workItemIds: [a.id, b.id, a.id],
      });
      expect(linked.status).toBe(200);
      expect(body<RequirementDetail>(linked).data.workItems.map((w) => w.code)).toEqual([
        'WI-001',
        'WI-002',
      ]);

      const fromWorkItem = body<WorkItemDetail>(
        await agent.get(`${base()}/work-items/${a.id}`),
      ).data;
      expect(fromWorkItem.requirements.map((r) => r.code)).toEqual(['REQ-001']);

      const replaced = await withCsrf(
        agent.put(`${base()}/requirements/${requirement.id}/work-items`),
      ).send({
        workItemIds: [b.id],
      });
      expect(body<RequirementDetail>(replaced).data.workItems.map((w) => w.code)).toEqual([
        'WI-002',
      ]);

      // Deleting a linked work item removes only the link.
      await withCsrf(agent.delete(`${base()}/work-items/${b.id}`)).expect(200);
      const after = body<RequirementDetail>(
        await agent.get(`${base()}/requirements/${requirement.id}`),
      ).data;
      expect(after.workItems).toEqual([]);
    });

    it('rejects cross-project links without partial changes', async () => {
      const requirement = body<RequirementDetail>(await createRequirement()).data;
      const own = body<WorkItemDetail>(await createWorkItem()).data;
      const other = body<Project>(
        await withCsrf(agent.post('/api/projects')).send({ code: 'OTHER', name: 'Other' }),
      ).data;
      const foreign = body<WorkItemDetail>(await createWorkItem({}, other)).data;

      await withCsrf(agent.put(`${base()}/requirements/${requirement.id}/work-items`))
        .send({ workItemIds: [own.id] })
        .expect(200);
      const rejected = await withCsrf(
        agent.put(`${base()}/requirements/${requirement.id}/work-items`),
      ).send({
        workItemIds: [foreign.id],
      });
      expect(rejected.status).toBe(400);
      const detail = body<RequirementDetail>(
        await agent.get(`${base()}/requirements/${requirement.id}`),
      ).data;
      expect(detail.workItems.map((w) => w.id)).toEqual([own.id]);

      // Records of another project are not reachable through this project's URL.
      await agent.get(`${base()}/work-items/${foreign.id}`).expect(404);
      const foreignRequirement = body<RequirementDetail>(await createRequirement({}, other)).data;
      await agent.get(`${base()}/requirements/${foreignRequirement.id}`).expect(404);
    });

    it('enforces ownership and archived read-only mode', async () => {
      const requirement = body<RequirementDetail>(await createRequirement()).data;
      await createUser('other@example.test');
      const intruder = await login(createApp(), 'other@example.test');
      await intruder.get(`${base()}/requirements/${requirement.id}`).expect(404);
      await withCsrf(intruder.put(`${base()}/requirements/${requirement.id}`))
        .send(requirement)
        .expect(404);

      await withCsrf(agent.post(`${base()}/archive`)).expect(200);
      expect((await createRequirement()).status).toBe(409);
      expect((await createWorkItem()).status).toBe(409);
      await agent.get(`${base()}/requirements/${requirement.id}`).expect(200);
    });
  });
});
