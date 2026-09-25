import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@pmocore/database';
import type { DashboardResponse, Project } from '@pmocore/shared';
import { createApp } from '../../app.js';
import {
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from '../../__tests__/setup/helpers.js';
import { loadDemoData, removeDemoData } from '../demo-data.js';

const count = async (table: string) =>
  (await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM ${sql.raw(table)}`)).rows[0]
    ?.n;

describe.skipIf(!hasTestDatabase)('BASC demonstration data (integration)', () => {
  beforeEach(async () => {
    await resetData();
  });

  it('loads identifiable synthetic projects once and removes only them', async () => {
    await createUser();
    const agent = await login(createApp());
    const real = body<Project>(
      await withCsrf(agent.post('/api/projects')).send({ code: 'BASC-REAL', name: 'Real project' }),
    ).data;

    expect(await loadDemoData()).toEqual({
      created: ['DEMO-HRIS', 'DEMO-PAYROLL', 'DEMO-QMS'],
      skipped: [],
    });
    expect(await loadDemoData()).toEqual({
      created: [],
      skipped: ['DEMO-HRIS', 'DEMO-PAYROLL', 'DEMO-QMS'],
    });

    const dashboard = body<DashboardResponse>(await agent.get('/api/dashboard')).data;
    const demo = dashboard.projects.filter((p) => p.code.startsWith('DEMO-'));
    expect(demo.map((p) => p.name.startsWith('[DEMO]'))).toEqual([true, true, true]);
    for (const project of demo) {
      expect(project.metrics).toMatchObject({
        requirements: { open: 1, total: 2 },
        actions: { open: 2, overdue: 1 },
        issues: { open: 1 },
        tests: { total: 3, failed: 1, retest: 1 },
        nextMilestone: { source: 'work-item' },
      });
      expect(project.metrics.progressPercent).not.toBeNull();
    }

    expect(await removeDemoData()).toEqual({ removed: ['DEMO-HRIS', 'DEMO-PAYROLL', 'DEMO-QMS'] });
    const remaining = body<DashboardResponse>(await agent.get('/api/dashboard')).data;
    expect(remaining.projects.map((p) => p.id)).toEqual([real.id]);
    for (const table of [
      'work_items',
      'requirements',
      'activities',
      'raid_items',
      'test_cases',
      'defects',
      'releases',
      'acceptances',
      'documents',
    ]) {
      expect(await count(table), table).toBe(0);
    }
    expect(await removeDemoData()).toEqual({ removed: [] });
  });

  it('refuses to guess an owner when several users exist', async () => {
    await createUser('a@example.test');
    await createUser('b@example.test');
    await expect(loadDemoData()).rejects.toThrow(/owner email/);
    await expect(loadDemoData('B@Example.test')).resolves.toMatchObject({
      created: ['DEMO-HRIS', 'DEMO-PAYROLL', 'DEMO-QMS'],
    });
  });
});
