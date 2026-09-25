import type { Express } from 'express';
import request, { type Test } from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { db, truncateTestData, users } from '@pmocore/database';
import { hashPassword } from '../../modules/auth/password.js';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? '';
export const hasTestDatabase = TEST_DATABASE_URL.length > 0;

export const TEST_ORIGIN = 'http://localhost:5173';
// Synthetic credentials used only against the local test database.
export const TEST_PASSWORD = 'correct-horse-battery-staple';

export type Agent = InstanceType<typeof TestAgent>;

/** Adds the headers the CSRF guard requires on state-changing requests. */
export const withCsrf = (req: Test) => req.set('Origin', TEST_ORIGIN).set('X-PMO-Request', '1');

export async function resetData() {
  await truncateTestData(TEST_DATABASE_URL);
}

export async function createUser(email = 'pm@example.test', options: { isActive?: boolean } = {}) {
  const [user] = await db
    .insert(users)
    .values({
      email,
      displayName: 'Test PM',
      passwordHash: await hashPassword(TEST_PASSWORD),
      isActive: options.isActive ?? true,
    })
    .returning();
  if (!user) throw new Error('Failed to create test user');
  return user;
}

export async function login(app: Express, email = 'pm@example.test', password = TEST_PASSWORD) {
  const agent = request.agent(app);
  await withCsrf(agent.post('/api/auth/login')).send({ email, password }).expect(200);
  return agent;
}

export type ApiBody<T = unknown> = {
  success: boolean;
  data: T;
  meta?: { page: number; pageSize: number; totalItems: number; totalPages: number };
  error?: { code: string; message: string; details?: unknown };
};

export const body = <T = unknown>(res: { body: unknown }) => res.body as ApiBody<T>;
