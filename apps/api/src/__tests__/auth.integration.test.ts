import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { db } from '@pmocore/database';
import { createApp } from '../app.js';
import { hashPassword, verifyPassword } from '../modules/auth/password.js';
import {
  TEST_ORIGIN,
  TEST_PASSWORD,
  body,
  createUser,
  hasTestDatabase,
  login,
  resetData,
  withCsrf,
} from './setup/helpers.js';

describe('password hashing', () => {
  it('hashes with scrypt and verifies only the correct password', async () => {
    const hash = await hashPassword('a-strong-password');
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(hash).not.toContain('a-strong-password');
    await expect(verifyPassword('a-strong-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
    await expect(verifyPassword('anything', 'not-a-hash')).resolves.toBe(false);
  });
});

describe.skipIf(!hasTestDatabase)('authentication and sessions (integration)', () => {
  beforeEach(async () => {
    await resetData();
  });

  it('logs in, sets a hardened session cookie, and returns the current user', async () => {
    const app = createApp();
    await createUser();

    const res = await withCsrf(request(app).post('/api/auth/login')).send({
      email: 'PM@Example.test',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(body<{ user: { email: string } }>(res).data.user.email).toBe('pm@example.test');
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/pmo_sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    // Secure is enabled only when NODE_ENV=production (tests run over plain HTTP).
    expect(cookie).not.toMatch(/Secure/);
  });

  it('issues a new session id at login (fixation defence)', async () => {
    const app = createApp();
    await createUser();
    const agent = await login(app);
    const before = await db.execute<{ sid: string }>(sql`SELECT sid FROM session`);
    await withCsrf(agent.post('/api/auth/login'))
      .send({ email: 'pm@example.test', password: TEST_PASSWORD })
      .expect(200);
    const after = await db.execute<{ sid: string }>(sql`SELECT sid FROM session`);
    const oldSid = before.rows[0]?.sid;
    expect(oldSid).toBeDefined();
    expect(after.rows.map((r) => r.sid)).not.toContain(oldSid);
  });

  it('returns the same generic error for unknown email, wrong password, and inactive user', async () => {
    const app = createApp();
    await createUser();
    await createUser('inactive@example.test', { isActive: false });

    const attempts = [
      { email: 'nobody@example.test', password: TEST_PASSWORD },
      { email: 'pm@example.test', password: 'wrong-password' },
      { email: 'inactive@example.test', password: TEST_PASSWORD },
    ];
    for (const attempt of attempts) {
      const res = await withCsrf(request(app).post('/api/auth/login')).send(attempt);
      expect(res.status).toBe(401);
      expect(body(res).error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('rejects malformed login bodies with a validation error', async () => {
    const res = await withCsrf(request(createApp()).post('/api/auth/login')).send({
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(body(res).error?.code).toBe('VALIDATION_ERROR');
  });

  it('throttles repeated failed logins for the same account', async () => {
    const app = createApp();
    await createUser();
    for (let i = 0; i < 5; i += 1) {
      await withCsrf(request(app).post('/api/auth/login'))
        .send({ email: 'pm@example.test', password: 'wrong-password' })
        .expect(401);
    }
    const blocked = await withCsrf(request(app).post('/api/auth/login')).send({
      email: 'pm@example.test',
      password: TEST_PASSWORD,
    });
    expect(blocked.status).toBe(429);
    expect(body(blocked).error?.code).toBe('RATE_LIMITED');
  });

  it('logs out and invalidates the session server-side', async () => {
    const app = createApp();
    await createUser();
    const agent = await login(app);
    await agent.get('/api/auth/me').expect(200);

    const res = await withCsrf(agent.post('/api/auth/logout'));
    expect(res.status).toBe(200);
    expect(String(res.headers['set-cookie'])).toMatch(/pmo_sid=;/);

    await agent.get('/api/auth/me').expect(401);
    const remaining = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM session`);
    expect(remaining.rows[0]?.n).toBe(0);
  });

  it('keeps sessions across an application restart (PostgreSQL persistence)', async () => {
    await createUser();
    const agent = await login(createApp());
    const cookie = (await agent.get('/api/auth/me')).request.cookies;

    const restarted = createApp();
    const res = await request(restarted).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('expires sessions older than the absolute lifetime', async () => {
    const app = createApp();
    await createUser();
    const agent = await login(app);
    await db.execute(
      sql`UPDATE session SET sess = jsonb_set(sess::jsonb, '{createdAt}', '0'::jsonb)::json`,
    );
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(body(res).error?.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a session whose user has been deactivated', async () => {
    const app = createApp();
    const user = await createUser();
    const agent = await login(app);
    await db.execute(sql`UPDATE users SET is_active = false WHERE id = ${user.id}`);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects state-changing requests without an allowed origin or the CSRF header', async () => {
    const app = createApp();
    await createUser();
    const credentials = { email: 'pm@example.test', password: TEST_PASSWORD };

    const noHeader = await request(app)
      .post('/api/auth/login')
      .set('Origin', TEST_ORIGIN)
      .send(credentials);
    expect(noHeader.status).toBe(403);
    expect(body(noHeader).error?.code).toBe('CSRF_REJECTED');

    const foreign = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .set('X-PMO-Request', '1')
      .send(credentials);
    expect(foreign.status).toBe(403);

    const noOrigin = await request(app)
      .post('/api/auth/login')
      .set('X-PMO-Request', '1')
      .send(credentials);
    expect(noOrigin.status).toBe(403);

    const referer = await request(app)
      .post('/api/auth/login')
      .set('Referer', `${TEST_ORIGIN}/login`)
      .set('X-PMO-Request', '1')
      .send(credentials);
    expect(referer.status).toBe(200);
  });

  it('returns 400 for malformed JSON instead of an internal error', async () => {
    const res = await withCsrf(request(createApp()).post('/api/auth/login'))
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(body(res).error?.code).toBe('VALIDATION_ERROR');
  });
});
