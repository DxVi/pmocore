import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ActivityDetail,
  DashboardResponse,
  Project,
  ProjectMetrics,
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

const shiftDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!hasTestDatabase)('dashboard (integration)', () => {
  let agent: Agent;
  let refs: ReferenceDataResponse['values'];
  const today = todayInTimeZone();

  const ref = (category: string, code: string) => {
    const value = refs.find((v) => v.category === category && v.code === code);
    if (!value) throw new Error(`Missing reference ${category}/${code}`);
    return value.id;
  };
  const createProject = async (code: string, extra: object = {}) =>
    body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code, name: `${code} project`, ...extra }),
    ).data;
  const post = (project: Project, path: string, payload: object) =>
    withCsrf(agent.post(`/api/projects/${project.id}${path}`))
      .send(payload)
      .expect(201);

  beforeEach(async () => {
    await resetData();
    await createUser();
    agent = await login(createApp());
    refs = body<ReferenceDataResponse>(await agent.get('/api/reference-data')).data.values;
  });

  it('derives every metric from project records', async () => {
    const project = await createProject('BASC-QMS', {
      healthId: ref('HEALTH', 'AMBER'),
      targetDate: '2026-10-13',
      nextMilestoneLabel: 'Manual milestone',
      nextMilestoneDate: shiftDays(today, 30),
    });

    // Plan: 50 %, completed (counts as 100 %), cancelled (excluded) → 75 %.
    await post(project, '/work-items', { title: 'Build', percentComplete: 50 });
    await post(project, '/work-items', {
      title: 'Design',
      percentComplete: 20,
      statusId: ref('STATUS', 'COMPLETED'),
    });
    await post(project, '/work-items', {
      title: 'Dropped',
      percentComplete: 0,
      statusId: ref('STATUS', 'CANCELLED'),
    });
    await post(project, '/work-items', {
      title: 'Go-live',
      isMilestone: true,
      plannedEnd: shiftDays(today, 8),
      percentComplete: 0,
    });

    await post(project, '/requirements', { statement: 'Open requirement' });
    await post(project, '/requirements', {
      statement: 'Accepted',
      statusId: ref('STATUS', 'ACCEPTED'),
    });
    await post(project, '/requirements', {
      statement: 'Deferred',
      statusId: ref('STATUS', 'DEFERRED'),
    });

    const meeting = body<ActivityDetail>(
      await post(project, '/activities', { title: 'Site visit', activityDate: today }),
    ).data;
    await withCsrf(agent.post(`/api/projects/${project.id}/activities/${meeting.id}/actions`))
      .send({
        actions: [
          { title: 'Overdue action', dueDate: shiftDays(today, -1) },
          { title: 'Due today', dueDate: today },
        ],
      })
      .expect(201);
    await post(project, '/raid-items', {
      typeId: ref('RAID_TYPE', 'ACTION'),
      title: 'Closed action',
      dateRaised: shiftDays(today, -5),
      dueDate: shiftDays(today, -3),
      statusId: ref('STATUS', 'COMPLETED'),
    });
    await post(project, '/raid-items', {
      typeId: ref('RAID_TYPE', 'ISSUE'),
      title: 'Open issue',
      dateRaised: today,
    });

    await post(project, '/tests', { scenario: 'A', resultId: ref('TEST_RESULT', 'FAILED') });
    await post(project, '/tests', { scenario: 'B', resultId: ref('TEST_RESULT', 'FOR_RETEST') });
    await post(project, '/tests', { scenario: 'C', resultId: ref('TEST_RESULT', 'PASSED') });
    await post(project, '/defects', { title: 'Open defect' });

    const metrics = body<ProjectMetrics>(
      await agent.get(`/api/projects/${project.id}/metrics`),
    ).data;
    expect(metrics).toMatchObject({
      progressPercent: 50,
      requirements: { open: 1, total: 3 },
      actions: { open: 2, total: 3, overdue: 1 },
      issues: { open: 1, total: 1 },
      tests: { total: 3, failed: 1, retest: 1 },
      defects: { open: 1, total: 1 },
      nextMilestone: { label: 'Go-live', date: shiftDays(today, 8), source: 'work-item' },
    });

    const dashboard = body<DashboardResponse>(await agent.get('/api/dashboard')).data;
    expect(dashboard.projects).toHaveLength(1);
    expect(dashboard.projects[0]).toMatchObject({
      code: 'BASC-QMS',
      healthId: ref('HEALTH', 'AMBER'),
      targetDate: '2026-10-13',
      metrics: { progressPercent: 50 },
    });
    expect(dashboard.totals).toEqual({
      activeProjects: 1,
      openRequirements: 1,
      openActions: 2,
      overdueActions: 1,
      openIssues: 1,
      failedTests: 1,
    });
    expect(Date.parse(dashboard.projects[0]?.metrics.lastActivityAt ?? '')).toBeGreaterThanOrEqual(
      Date.parse(project.updatedAt),
    );
  });

  it('represents missing data as unavailable and excludes archived and other users’ projects', async () => {
    const empty = await createProject('EMPTY');
    const archived = await createProject('OLD');
    await withCsrf(agent.post(`/api/projects/${archived.id}/archive`)).expect(200);
    await createUser('other@example.test');
    const other = await login(createApp(), 'other@example.test');
    await withCsrf(other.post('/api/projects'))
      .send({ code: 'THEIRS', name: 'Theirs' })
      .expect(201);

    const dashboard = body<DashboardResponse>(await agent.get('/api/dashboard')).data;
    expect(dashboard.projects.map((p) => p.code)).toEqual(['EMPTY']);
    expect(dashboard.projects[0]).toMatchObject({
      healthId: null,
      metrics: {
        progressPercent: null,
        requirements: { open: 0, total: 0 },
        tests: { total: 0, failed: 0, retest: 0 },
        nextMilestone: null,
        lastActivityAt: empty.updatedAt,
      },
    });

    // Archived projects keep their metrics available on their own overview.
    await agent.get(`/api/projects/${archived.id}/metrics`).expect(200);
    await other.get(`/api/projects/${empty.id}/metrics`).expect(404);
  });
});
