/**
 * Test-database support for integration tests (design §16.1, DS-11).
 *
 * Destructive by design, so it refuses to run against any database whose name
 * does not end in `_test`. It never reads DATABASE_URL implicitly.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { runMigrations, seedReferenceData } from './maintenance.js';

export function assertTestDatabaseUrl(connectionString: string): void {
  const name = new URL(connectionString).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error('Refusing to reset a database whose name does not end in "_test".');
  }
}

/** Drops all objects, re-applies every migration, and seeds reference data. */
export async function resetTestDatabase(connectionString: string): Promise<void> {
  assertTestDatabaseUrl(connectionString);
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    const database = drizzle(client);
    await runMigrations(database);
    await seedReferenceData(database);
  } finally {
    await client.end();
  }
}

/** Removes all business/identity rows while keeping schema and reference data. */
export async function truncateTestData(connectionString: string): Promise<void> {
  assertTestDatabaseUrl(connectionString);
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      TRUNCATE TABLE attachment_content_chunks, attachments, release_defects, release_requirements, acceptances, documents,
        defects, test_cases, raid_items, activities, requirement_work_items, requirements,
        work_items, releases, record_counters, projects, session, users
      RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}
