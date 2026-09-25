import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@pmocore/database';
import type {
  ActivityDetail,
  ActivityListItem,
  Project,
  RaidItem,
  RaidItemDetail,
  ReferenceDataResponse,
} from '@pmocore/shared';
import { createApp } from '../../../app.js';
import { todayInTimeZone } from '../../../lib/today.js';
import {
  type Agent,
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from '../../../__tests__/setup/helpers.js';

describe.skipIf(!hasTestDatabase)('Meetings & Visits and Actions/RAID (integration)', () => {
  let agent: Agent;
  let project: Project;
  let refs: ReferenceDataResponse['values'];
  const today = todayInTimeZone();
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);

  const ref = (category: string, code: string) => {
    const value = refs.find((v) => v.category === category && v.code === code);
    if (!value) throw new Error(`Missing reference ${category}/${code}`);
    return value.id;
  };
  const base = () => `/api/projects/${project.id}`;

  const createActivity = (overrides: Record<string, unknown> = {}) =>
    withCsrf(agent.post(`${base()}/activities`)).send({
      activityTypeId: ref('ACTIVITY_TYPE', 'SITE_VISIT'),
      title: 'Registrar site visit',
      activityDate: today,
      startTime: '09:30',
      statusId: ref('STATUS', 'NOT_STARTED'),
      location: 'BASC Registrar',
      attendees: 'Registrar\nIT Head',
      findings: 'Queue display needs larger font',
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

  describe('meetings & visits', () => {
    it('creates, reads, updates and lists an activity with stable codes', async () => {
      const created = await createActivity();
      expect(created.status).toBe(201);
      const activity = body<ActivityDetail>(created).data;
      expect(activity).toMatchObject({
        code: 'MV-001',
        title: 'Registrar site visit',
        startTime: '09:30:00',
        followUps: [],
        attachmentCount: 0,
        version: 1,
      });
      expect(activity.preparedByUserId).toBe(activity.createdBy);

      const second = body<ActivityDetail>(await createActivity({ title: 'Kick-off meeting' })).data;
      expect(second.code).toBe('MV-002');

      const updated = await withCsrf(agent.put(`${base()}/activities/${activity.id}`)).send({
        ...activity,
        outcomes: 'Increase font size; add audio call-out',
        statusId: ref('STATUS', 'COMPLETED'),
      });
      expect(updated.status).toBe(200);
      expect(body<ActivityDetail>(updated).data).toMatchObject({
        outcomes: 'Increase font size; add audio call-out',
        version: 2,
        code: 'MV-001',
      });

      const stale = await withCsrf(agent.put(`${base()}/activities/${activity.id}`)).send({
        ...activity,
      });
      expect(stale.status).toBe(409);
      expect(body(stale).error?.code).toBe('VERSION_CONFLICT');

      const list = await agent.get(`${base()}/activities?q=kick-off`).expect(200);
      expect(body<ActivityListItem[]>(list).data.map((a) => a.code)).toEqual(['MV-002']);
      expect(body(list).meta?.totalItems).toBe(1);
    });

    it('validates input and reference categories', async () => {
      const missing = await createActivity({ title: '', activityDate: 'not-a-date' });
      expect(missing.status).toBe(400);
      const paths = (body(missing).error?.details as { path: string }[]).map((d) => d.path);
      expect(paths).toEqual(expect.arrayContaining(['title', 'activityDate']));

      const wrongType = await createActivity({ activityTypeId: ref('RAID_TYPE', 'RISK') });
      expect(wrongType.status).toBe(400);

      const badTimes = await createActivity({ startTime: '10:00', endTime: '09:00' });
      expect(badTimes.status).toBe(400);
    });

    it('filters by type, status, date range and upcoming schedule', async () => {
      await createActivity({ title: 'Past meeting', activityDate: '2026-01-10' });
      await createActivity({
        title: 'Future demo',
        activityDate: '2099-01-01',
        activityTypeId: ref('ACTIVITY_TYPE', 'RELEASE_DEMO'),
      });
      await createActivity({
        title: 'Cancelled future',
        activityDate: '2099-02-01',
        statusId: ref('STATUS', 'CANCELLED'),
      });

      const titles = async (query: string) =>
        body<ActivityListItem[]>(await agent.get(`${base()}/activities?${query}`)).data.map(
          (a) => a.title,
        );

      expect(await titles('upcoming=true&sort=activityDate&dir=asc')).toEqual(['Future demo']);
      expect(await titles(`activityTypeId=${ref('ACTIVITY_TYPE', 'RELEASE_DEMO')}`)).toEqual([
        'Future demo',
      ]);
      expect(await titles('from=2026-01-01&to=2026-01-31')).toEqual(['Past meeting']);
      expect(await titles(`statusId=${ref('STATUS', 'CANCELLED')}`)).toEqual(['Cancelled future']);
    });

    it('links a related requirement only within the same project', async () => {
      const [user] = (await db.execute<{ id: string }>(sql`SELECT id FROM users LIMIT 1`)).rows;
      const other = body<Project>(
        await withCsrf(agent.post('/api/projects')).send({ code: 'OTHER', name: 'Other' }),
      ).data;
      const insertRequirement = async (projectId: string) =>
        (
          await db.execute<{ id: string }>(sql`
            INSERT INTO requirements (project_id, code, statement, created_by, updated_by)
            VALUES (${projectId}, 'REQ-001', 'Show ticket number', ${user?.id}, ${user?.id})
            RETURNING id`)
        ).rows[0]?.id;
      const ownRequirement = await insertRequirement(project.id);
      const foreignRequirement = await insertRequirement(other.id);

      const foreign = await createActivity({ relatedRequirementId: foreignRequirement });
      expect(foreign.status).toBe(400);
      expect(body(foreign).error?.code).toBe('VALIDATION_ERROR');

      const linked = body<ActivityDetail>(
        await createActivity({ relatedRequirementId: ownRequirement }),
      ).data;
      expect(linked.relatedRequirement).toMatchObject({ code: 'REQ-001' });
    });
  });

  describe('quick-add follow-ups', () => {
    it('creates follow-up actions that inherit activity context, in one transaction', async () => {
      const activity = body<ActivityDetail>(await createActivity()).data;
      const res = await withCsrf(agent.post(`${base()}/activities/${activity.id}/actions`)).send({
        actions: [
          { title: 'Send revised screen mock-up', ownerName: 'Dixon', dueDate: yesterday },
          {
            title: 'Registrar may not approve budget',
            raidTypeId: ref('RAID_TYPE', 'RISK'),
            priorityId: ref('PRIORITY', 'HIGH'),
          },
        ],
      });
      expect(res.status).toBe(201);
      const created = body<RaidItem[]>(res).data;
      expect(created.map((r) => r.code)).toEqual(['ACT-001', 'RSK-001']);
      expect(created[0]).toMatchObject({
        sourceActivityId: activity.id,
        dateRaised: activity.activityDate,
        statusId: ref('STATUS', 'NOT_STARTED'),
        overdue: true,
        remarks: 'Raised in MV-001: Registrar site visit',
      });

      const detail = body<ActivityDetail>(
        await agent.get(`${base()}/activities/${activity.id}`),
      ).data;
      expect(detail.followUps.map((f) => [f.code, f.overdue])).toEqual([
        ['ACT-001', true],
        ['RSK-001', false],
      ]);
      const list = body<ActivityListItem[]>(await agent.get(`${base()}/activities`)).data;
      expect(list[0]?.openActionCount).toBe(2);
    });

    it('rolls back every follow-up when one is invalid', async () => {
      const activity = body<ActivityDetail>(await createActivity()).data;
      const res = await withCsrf(agent.post(`${base()}/activities/${activity.id}/actions`)).send({
        actions: [
          { title: 'Valid action' },
          { title: 'Wrong type', raidTypeId: ref('STATUS', 'BLOCKED') },
        ],
      });
      expect(res.status).toBe(400);
      const count = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM raid_items`);
      expect(count.rows[0]?.n).toBe(0);
    });

    it('blocks deleting an activity that has follow-ups, and deletes it otherwise', async () => {
      const activity = body<ActivityDetail>(await createActivity()).data;
      await withCsrf(agent.post(`${base()}/activities/${activity.id}/actions`))
        .send({ actions: [{ title: 'Follow up' }] })
        .expect(201);
      const blocked = await withCsrf(agent.delete(`${base()}/activities/${activity.id}`));
      expect(blocked.status).toBe(409);
      expect(body(blocked).error?.code).toBe('RECORD_IN_USE');

      const lone = body<ActivityDetail>(await createActivity({ title: 'Lone meeting' })).data;
      await withCsrf(agent.delete(`${base()}/activities/${lone.id}`)).expect(200);
      await agent.get(`${base()}/activities/${lone.id}`).expect(404);
    });
  });

  describe('actions & RAID', () => {
    const createRaid = (overrides: Record<string, unknown> = {}) =>
      withCsrf(agent.post(`${base()}/raid-items`)).send({
        typeId: ref('RAID_TYPE', 'ISSUE'),
        title: 'Printer driver incompatible',
        dateRaised: '2026-09-01',
        statusId: ref('STATUS', 'IN_PROGRESS'),
        ownerName: 'IT Head',
        dueDate: '2026-09-15',
        ...overrides,
      });

    it('supports all six RAID types with type-based codes', async () => {
      const codes: string[] = [];
      for (const type of ['ACTION', 'RISK', 'ISSUE', 'DECISION', 'DEPENDENCY', 'CHANGE_REQUEST']) {
        const res = await createRaid({ typeId: ref('RAID_TYPE', type) });
        expect(res.status).toBe(201);
        codes.push(body<RaidItemDetail>(res).data.code);
      }
      expect(codes).toEqual(['ACT-001', 'RSK-001', 'ISS-001', 'DEC-001', 'DEP-001', 'CR-001']);
    });

    it('derives overdue and days open, and manages the closed date by status', async () => {
      const item = body<RaidItemDetail>(await createRaid()).data;
      expect(item.overdue).toBe(true);
      expect(item.closedDate).toBeNull();
      expect(item.daysOpen).toBeGreaterThan(0);

      const closed = body<RaidItemDetail>(
        await withCsrf(agent.put(`${base()}/raid-items/${item.id}`)).send({
          ...item,
          statusId: ref('STATUS', 'COMPLETED'),
        }),
      ).data;
      expect(closed.closedDate).toBe(today);
      expect(closed.overdue).toBe(false);

      const reopened = body<RaidItemDetail>(
        await withCsrf(agent.put(`${base()}/raid-items/${item.id}`)).send({
          ...closed,
          statusId: ref('STATUS', 'BLOCKED'),
        }),
      ).data;
      expect(reopened.closedDate).toBeNull();
      expect(reopened.code).toBe('ISS-001');
    });

    it('filters open, overdue, type, owner and source activity', async () => {
      const activity = body<ActivityDetail>(await createActivity()).data;
      await createRaid({ title: 'Overdue issue' });
      await createRaid({ title: 'Future issue', dueDate: '2099-01-01' });
      await createRaid({ title: 'Deferred issue', statusId: ref('STATUS', 'DEFERRED') });
      await createRaid({
        title: 'From visit',
        sourceActivityId: activity.id,
        typeId: ref('RAID_TYPE', 'ACTION'),
        ownerName: 'Registrar',
        dueDate: null,
      });

      const titles = async (query: string) =>
        body<RaidItem[]>(await agent.get(`${base()}/raid-items?${query}`))
          .data.map((r) => r.title)
          .sort();

      expect(await titles('overdue=true')).toEqual(['Overdue issue']);
      expect(await titles('open=true')).toEqual(['From visit', 'Future issue', 'Overdue issue']);
      expect(await titles('open=false')).toEqual(['Deferred issue']);
      expect(await titles(`sourceActivityId=${activity.id}`)).toEqual(['From visit']);
      expect(await titles('owner=registrar')).toEqual(['From visit']);
      expect(await titles(`typeId=${ref('RAID_TYPE', 'ACTION')}`)).toEqual(['From visit']);

      await createRaid({ title: 'Critical issue', priorityId: ref('PRIORITY', 'CRITICAL') });
      await createRaid({ title: 'Low issue', priorityId: ref('PRIORITY', 'LOW') });
      const byPriority = body<RaidItem[]>(
        await agent.get(`${base()}/raid-items?sort=priority&dir=asc`),
      ).data.map((r) => r.title);
      expect(byPriority.slice(0, 2)).toEqual(['Critical issue', 'Low issue']);
    });

    it('returns detail with the source activity and validates types', async () => {
      const activity = body<ActivityDetail>(await createActivity()).data;
      const item = body<RaidItemDetail>(await createRaid({ sourceActivityId: activity.id })).data;
      const detail = body<RaidItemDetail>(await agent.get(`${base()}/raid-items/${item.id}`)).data;
      expect(detail.sourceActivity).toMatchObject({
        code: 'MV-001',
        title: 'Registrar site visit',
      });

      expect((await createRaid({ typeId: ref('STATUS', 'BLOCKED') })).status).toBe(400);
      expect((await createRaid({ typeId: undefined })).status).toBe(400);
      expect((await createRaid({ closedDate: '2026-08-01' })).status).toBe(400);

      await withCsrf(agent.delete(`${base()}/raid-items/${item.id}`)).expect(200);
      await agent.get(`${base()}/raid-items/${item.id}`).expect(404);
    });

    it('isolates projects: other projects and other users cannot see or change records', async () => {
      const activity = body<ActivityDetail>(await createActivity()).data;
      const item = body<RaidItemDetail>(await createRaid()).data;
      const other = body<Project>(
        await withCsrf(agent.post('/api/projects')).send({ code: 'OTHER', name: 'Other' }),
      ).data;

      // Same user, wrong project in the path.
      await agent.get(`/api/projects/${other.id}/activities/${activity.id}`).expect(404);
      await agent.get(`/api/projects/${other.id}/raid-items/${item.id}`).expect(404);
      const crossLink = await withCsrf(agent.post(`/api/projects/${other.id}/raid-items`)).send({
        typeId: ref('RAID_TYPE', 'ACTION'),
        title: 'Cross link',
        dateRaised: today,
        sourceActivityId: activity.id,
      });
      expect(crossLink.status).toBe(400);

      // Different user.
      await createUser('other@example.test');
      const intruder = await login(createApp(), 'other@example.test');
      await intruder.get(`${base()}/activities`).expect(404);
      await withCsrf(intruder.put(`${base()}/raid-items/${item.id}`))
        .send({ ...item })
        .expect(404);
    });

    it('rejects writes on archived projects', async () => {
      const activity = body<ActivityDetail>(await createActivity()).data;
      await withCsrf(agent.post(`${base()}/archive`)).expect(200);
      expect((await createActivity()).status).toBe(409);
      expect(
        (
          await withCsrf(agent.post(`${base()}/activities/${activity.id}/actions`)).send({
            actions: [{ title: 'x' }],
          })
        ).status,
      ).toBe(409);
      await agent.get(`${base()}/activities/${activity.id}`).expect(200);
    });
  });
});
