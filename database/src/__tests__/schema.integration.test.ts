import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { seedReferenceData } from '../maintenance.js';
import { REFERENCE_SEED } from '../seed/reference-data.js';
import { assertTestDatabaseUrl, resetTestDatabase, truncateTestData } from '../testing.js';

const url = process.env.TEST_DATABASE_URL ?? '';

describe.skipIf(!url)('database schema (integration, local PostgreSQL test DB)', () => {
  let client: Client;

  beforeAll(async () => {
    await resetTestDatabase(url);
    client = new Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach(async () => {
    await truncateTestData(url);
  });

  async function createUser(): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO users (email, display_name, password_hash) VALUES ('pm@example.test', 'PM', 'x') RETURNING id`,
    );
    return rows[0].id;
  }

  async function createProject(userId: string, code: string): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO projects (code, name, owner_user_id, created_by, updated_by)
       VALUES ($1, $1, $2, $2, $2) RETURNING id`,
      [code, userId],
    );
    return rows[0].id;
  }

  async function createRequirement(
    projectId: string,
    userId: string,
    code: string,
  ): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO requirements (project_id, code, statement, created_by, updated_by)
       VALUES ($1, $2, 'Statement', $3, $3) RETURNING id`,
      [projectId, code, userId],
    );
    return rows[0].id;
  }

  it('applies every migration to an empty database', async () => {
    const { rows } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`,
    );
    expect(rows.map((r) => r.table_name)).toEqual([
      'acceptances',
      'activities',
      'attachments',
      'defects',
      'documents',
      'projects',
      'raid_items',
      'record_counters',
      'reference_values',
      'release_defects',
      'release_requirements',
      'releases',
      'requirement_work_items',
      'requirements',
      'session',
      'test_cases',
      'users',
      'work_items',
    ]);
  });

  it('seeds exactly the approved reference values and is idempotent', async () => {
    const before = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM reference_values',
    );
    await seedReferenceData(drizzle(client));
    const after = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM reference_values',
    );
    const expected = Object.values(REFERENCE_SEED).reduce((sum, values) => sum + values.length, 0);
    expect(before.rows[0].n).toBe(expected);
    expect(after.rows[0].n).toBe(expected);

    const statuses = await client.query<{ label: string; semantic: string }>(
      `SELECT label, semantic FROM reference_values WHERE category = 'STATUS' ORDER BY sort_order`,
    );
    expect(statuses.rows).toEqual([
      { label: 'Not Started', semantic: 'OPEN' },
      { label: 'In Progress', semantic: 'OPEN' },
      { label: 'For Review / Validation', semantic: 'OPEN' },
      { label: 'Blocked', semantic: 'OPEN' },
      { label: 'Completed', semantic: 'DONE' },
      { label: 'Accepted', semantic: 'DONE' },
      { label: 'Deferred', semantic: 'INACTIVE' },
      { label: 'Cancelled', semantic: 'INACTIVE' },
    ]);

    const results = await client.query<{ label: string; semantic: string }>(
      `SELECT label, semantic FROM reference_values WHERE category = 'TEST_RESULT' ORDER BY sort_order`,
    );
    const failed = results.rows.find((r) => r.label === 'Failed');
    const retest = results.rows.find((r) => r.label === 'For Retest');
    expect(failed?.semantic).toBe('FAIL');
    expect(retest?.semantic).toBe('RETEST');
  });

  it('rejects a relationship between records of different projects', async () => {
    const userId = await createUser();
    const projectA = await createProject(userId, 'PROJ-A');
    const projectB = await createProject(userId, 'PROJ-B');
    const requirementInB = await createRequirement(projectB, userId, 'REQ-001');

    await expect(
      client.query(
        `INSERT INTO test_cases (project_id, code, scenario, requirement_id, created_by, updated_by)
         VALUES ($1, 'TC-001', 'Scenario', $2, $3, $3)`,
        [projectA, requirementInB, userId],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('restricts deleting a record that is still referenced', async () => {
    const userId = await createUser();
    const project = await createProject(userId, 'PROJ-A');
    const requirement = await createRequirement(project, userId, 'REQ-001');
    await client.query(
      `INSERT INTO test_cases (project_id, code, scenario, requirement_id, created_by, updated_by)
       VALUES ($1, 'TC-001', 'Scenario', $2, $3, $3)`,
      [project, requirement, userId],
    );

    // ON DELETE RESTRICT raises restrict_violation (23001).
    await expect(
      client.query('DELETE FROM requirements WHERE id = $1', [requirement]),
    ).rejects.toMatchObject({
      code: '23001',
    });
  });

  it('enforces project code format, unique record codes, and check constraints', async () => {
    const userId = await createUser();
    await expect(createProject(userId, 'bad code')).rejects.toMatchObject({ code: '23514' });

    const project = await createProject(userId, 'PROJ-A');
    await createRequirement(project, userId, 'REQ-001');
    await expect(createRequirement(project, userId, 'REQ-001')).rejects.toMatchObject({
      code: '23505',
    });

    await expect(
      client.query(
        `INSERT INTO work_items (project_id, code, title, percent_complete, created_by, updated_by)
         VALUES ($1, 'WI-001', 'Task', 101, $2, $2)`,
        [project, userId],
      ),
    ).rejects.toMatchObject({ code: '23514' });

    await expect(
      client.query(
        `INSERT INTO documents (project_id, code, title, link_url, created_by, updated_by)
         VALUES ($1, 'DOC-001', 'Doc', 'javascript:alert(1)', $2, $2)`,
        [project, userId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('refuses to reset a database that is not a test database', () => {
    expect(() => assertTestDatabaseUrl('postgresql://u:p@localhost:5432/pmocore')).toThrow(/_test/);
  });
});
