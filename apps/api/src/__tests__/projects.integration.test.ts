import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { db } from '@pmocore/database';
import type { Project, ProjectOverview, ReferenceDataResponse } from '@pmocore/shared';
import { createApp } from '../app.js';
import { allocateRecordCode } from '../lib/record-code.js';
import {
  type Agent,
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from './setup/helpers.js';

describe.skipIf(!hasTestDatabase)('projects API (integration)', () => {
  let agent: Agent;
  let refs: ReferenceDataResponse['values'];

  const ref = (category: string, code: string) => {
    const value = refs.find((v) => v.category === category && v.code === code);
    if (!value) throw new Error(`Missing reference ${category}/${code}`);
    return value.id;
  };

  const createProject = async (overrides: Record<string, unknown> = {}) => {
    const res = await withCsrf(agent.post('/api/projects')).send({
      code: 'basc-cqms',
      name: 'Campus Queueing',
      phaseId: ref('PROJECT_PHASE', 'DEVELOPMENT'),
      statusId: ref('STATUS', 'IN_PROGRESS'),
      healthId: ref('HEALTH', 'GREEN'),
      targetDate: '2026-10-13',
      ...overrides,
    });
    return res;
  };

  beforeEach(async () => {
    await resetData();
    await createUser();
    agent = await login(createApp());
    refs = body<ReferenceDataResponse>(await agent.get('/api/reference-data').expect(200)).data
      .values;
  });

  it('serves the approved reference data', () => {
    const labels = (category: string) =>
      refs.filter((v) => v.category === category).map((v) => v.label);
    expect(labels('STATUS')).toEqual([
      'Not Started',
      'In Progress',
      'For Review / Validation',
      'Blocked',
      'Completed',
      'Accepted',
      'Deferred',
      'Cancelled',
    ]);
    expect(labels('ENVIRONMENT')).toEqual(['Development', 'Test', 'UAT', 'Production']);
    expect(labels('REQUIREMENT_TYPE')).toEqual([]);
  });

  it('creates, reads, and lists a project owned by the creator', async () => {
    const created = await createProject();
    expect(created.status).toBe(201);
    const project = body<Project>(created).data;
    expect(project).toMatchObject({ code: 'BASC-CQMS', name: 'Campus Queueing', version: 1 });
    expect(project.archivedAt).toBeNull();

    const fetched = await agent.get(`/api/projects/${project.id}`).expect(200);
    expect(body<Project>(fetched).data.id).toBe(project.id);

    const list = await agent.get('/api/projects?q=queue').expect(200);
    expect(body<Project[]>(list).data.map((p) => p.code)).toEqual(['BASC-CQMS']);
    expect(body(list).meta).toEqual({ page: 1, pageSize: 25, totalItems: 1, totalPages: 1 });
  });

  it('validates input, reference categories, and duplicate codes', async () => {
    const invalid = await createProject({ code: 'bad code!', name: '' });
    expect(invalid.status).toBe(400);
    expect(body(invalid).error?.code).toBe('VALIDATION_ERROR');

    const wrongCategory = await createProject({ phaseId: ref('STATUS', 'BLOCKED') });
    expect(wrongCategory.status).toBe(400);
    expect(body(wrongCategory).error?.details).toEqual([
      { path: 'phaseId', message: 'Select a valid value' },
    ]);

    await createProject().then((r) => expect(r.status).toBe(201));
    const duplicate = await createProject();
    expect(duplicate.status).toBe(409);
    expect(body(duplicate).error).toMatchObject({
      code: 'DUPLICATE',
      message: 'A project with this code already exists',
    });
  });

  it('updates with optimistic concurrency and keeps the code immutable', async () => {
    const project = body<Project>(await createProject()).data;
    const update = {
      name: 'Campus Queueing Management',
      pmRemarks: 'Site visit scheduled',
      healthId: ref('HEALTH', 'AMBER'),
      code: 'CHANGED',
      version: 1,
    };

    const res = await withCsrf(agent.put(`/api/projects/${project.id}`))
      .send(update)
      .expect(200);
    const updated = body<Project>(res).data;
    expect(updated).toMatchObject({
      name: 'Campus Queueing Management',
      pmRemarks: 'Site visit scheduled',
      code: 'BASC-CQMS',
      version: 2,
      // Omitted optional fields are cleared (full-replacement PUT semantics).
      targetDate: null,
    });

    const stale = await withCsrf(agent.put(`/api/projects/${project.id}`)).send(update);
    expect(stale.status).toBe(409);
    expect(body(stale).error?.code).toBe('VERSION_CONFLICT');
  });

  it('archives read-only and unarchives without losing data', async () => {
    const project = body<Project>(await createProject()).data;
    const archived = body<Project>(
      await withCsrf(agent.post(`/api/projects/${project.id}/archive`)).expect(200),
    ).data;
    expect(archived.archivedAt).not.toBeNull();

    const blocked = await withCsrf(agent.put(`/api/projects/${project.id}`)).send({
      name: 'X',
      version: archived.version,
    });
    expect(blocked.status).toBe(409);
    expect(body(blocked).error?.code).toBe('PROJECT_ARCHIVED');

    // Archived projects leave the default list but remain retrievable.
    expect(body<Project[]>(await agent.get('/api/projects')).data).toHaveLength(0);
    expect(body<Project[]>(await agent.get('/api/projects?archived=archived')).data).toHaveLength(
      1,
    );
    await agent.get(`/api/projects/${project.id}`).expect(200);

    // Project-scoped module writes are blocked too.
    const moduleWrite = await withCsrf(agent.post(`/api/projects/${project.id}/work-items`)).send(
      {},
    );
    expect(moduleWrite.status).toBe(409);

    const restored = await withCsrf(agent.post(`/api/projects/${project.id}/unarchive`)).expect(
      200,
    );
    expect(body<Project>(restored).data.archivedAt).toBeNull();
  });

  it('enforces project ownership server-side and never discloses other projects', async () => {
    const project = body<Project>(await createProject()).data;

    await createUser('other@example.test');
    const other = await login(createApp(), 'other@example.test');

    for (const path of [`/api/projects/${project.id}`, `/api/projects/${project.id}/overview`]) {
      const res = await other.get(path);
      expect(res.status).toBe(404);
      expect(body(res).error?.code).toBe('NOT_FOUND');
    }
    await withCsrf(other.put(`/api/projects/${project.id}`))
      .send({ name: 'Hijack', version: 1 })
      .expect(404);
    await withCsrf(other.post(`/api/projects/${project.id}/archive`)).expect(404);
    await other.get(`/api/projects/${project.id}/lookup?type=requirement`).expect(404);
    expect(body<Project[]>(await other.get('/api/projects?archived=all')).data).toHaveLength(0);

    await agent.get('/api/projects/not-a-uuid').expect(404);
  });

  it('returns an overview with recent activity and last activity', async () => {
    const project = body<Project>(await createProject()).data;
    const res = await agent.get(`/api/projects/${project.id}/overview`).expect(200);
    const overview = body<ProjectOverview>(res).data;
    expect(overview.project.id).toBe(project.id);
    expect(overview.recentActivity[0]).toMatchObject({ type: 'project', code: 'BASC-CQMS' });
    expect(overview.lastActivityAt).toBe(project.updatedAt);
  });

  it('allocates unique sequential record codes under concurrency and serves lookups', async () => {
    const project = body<Project>(await createProject()).data;
    const codes = await Promise.all(
      Array.from({ length: 12 }, () =>
        db.transaction((tx) => allocateRecordCode(tx, project.id, 'requirement', 'REQ')),
      ),
    );
    expect(new Set(codes).size).toBe(12);
    expect([...codes].sort()[0]).toBe('REQ-001');
    expect([...codes].sort()[11]).toBe('REQ-012');

    const [user] = (await db.execute<{ id: string }>(sql`SELECT id FROM users LIMIT 1`)).rows;
    await db.execute(sql`
      INSERT INTO requirements (project_id, code, statement, created_by, updated_by)
      VALUES (${project.id}, 'REQ-001', 'Queue display shows ticket number', ${user?.id}, ${user?.id})`);

    const found = await agent
      .get(`/api/projects/${project.id}/lookup?type=requirement&q=ticket`)
      .expect(200);
    expect(body(found).data).toEqual([
      expect.objectContaining({ code: 'REQ-001', title: 'Queue display shows ticket number' }),
    ]);
    await agent.get(`/api/projects/${project.id}/lookup?type=unknown`).expect(400);
  });
});

describe.skipIf(!hasTestDatabase)('route protection (integration)', () => {
  const id = '00000000-0000-4000-8000-000000000000';
  const protectedRoutes: [method: 'get' | 'post' | 'put' | 'delete', path: string][] = [
    ['get', '/api/auth/me'],
    ['get', '/api/reference-data'],
    ['get', '/api/dashboard'],
    ['get', '/api/projects'],
    ['post', '/api/projects'],
    ['get', `/api/projects/${id}`],
    ['put', `/api/projects/${id}`],
    ['post', `/api/projects/${id}/archive`],
    ['post', `/api/projects/${id}/unarchive`],
    ['get', `/api/projects/${id}/overview`],
    ['get', `/api/projects/${id}/lookup?type=requirement`],
    ...[
      'work-items',
      'requirements',
      'activities',
      'raid-items',
      'tests',
      'defects',
      'releases',
      'acceptances',
      'documents',
      'attachments',
    ].flatMap((m): ['get' | 'post', string][] => [
      ['get', `/api/projects/${id}/${m}`],
      ['post', `/api/projects/${id}/${m}`],
    ]),
    ['get', '/api/unknown-route'],
  ];

  it.each(protectedRoutes)('%s %s requires an authenticated session', async (method, path) => {
    const res = await withCsrf(request(createApp())[method](path));
    expect(res.status).toBe(401);
    expect(body(res).error?.code).toBe('UNAUTHENTICATED');
  });

  it('keeps the health check public', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
  });
});
