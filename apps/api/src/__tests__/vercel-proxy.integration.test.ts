import type { Express } from 'express';
import request, { type Test } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_PASSWORD, hasTestDatabase } from './setup/helpers.js';

// The browser's origin: the Vercel site that proxies /api to Render.
const SITE = 'https://pmocore-staging.vercel.app';
const RENDER = 'https://pmocore-api.onrender.com';

type Helpers = typeof import('./setup/helpers.js');

/**
 * Production-mode behaviour of the API as it is reached through Vercel's
 * /api rewrite (PMOCORE-DEPLOY-VERCEL): Render's proxy forwards the request
 * with X-Forwarded-Proto=https, and the browser's Origin is the Vercel site.
 */
describe.skipIf(!hasTestDatabase)('API behind the Vercel proxy (production mode)', () => {
  let app: Express;
  let helpers: Helpers;

  const viaProxy = (req: Test) => req.set('X-Forwarded-Proto', 'https');
  const fromSite = (req: Test, origin = SITE) =>
    viaProxy(req).set('Origin', origin).set('X-PMO-Request', '1');

  beforeAll(async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ORIGIN', SITE);
    vi.stubEnv('SERVE_WEB_APP', 'false');
    helpers = await import('./setup/helpers.js');
    app = (await import('../app.js')).createApp();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  beforeEach(async () => {
    await helpers.resetData();
    await helpers.createUser();
  });

  const signIn = () =>
    fromSite(request(app).post('/api/auth/login')).send({
      email: 'pm@example.test',
      password: TEST_PASSWORD,
    });

  it('issues a first-party, HttpOnly, Secure, SameSite=Lax session cookie', async () => {
    const res = await signIn();
    expect(res.status).toBe(200);
    const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).join(';');
    expect(cookie).toMatch(/^pmo_sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    // Host-only: the browser scopes it to the Vercel host it called.
    expect(cookie).not.toMatch(/Domain=/i);
    expect(res.headers['cache-control']).toBe('no-store');

    const sid = cookie.split(';')[0] ?? '';
    const me = await viaProxy(request(app).get('/api/auth/me')).set('Cookie', sid);
    expect(me.status).toBe(200);
    expect(me.headers['cache-control']).toBe('no-store');
  });

  it('never issues the session cookie over plain HTTP', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', SITE)
      .set('X-PMO-Request', '1')
      .send({ email: 'pm@example.test', password: TEST_PASSWORD });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rejects state-changing requests from any origin other than the Vercel site', async () => {
    for (const origin of [
      RENDER,
      'https://pmocore-staging-git-feature-x.vercel.app',
      'https://evil.example',
      'null',
    ]) {
      const res = await fromSite(request(app).post('/api/auth/login'), origin).send({
        email: 'pm@example.test',
        password: TEST_PASSWORD,
      });
      expect(res.status, origin).toBe(403);
      expect(res.headers['set-cookie'], origin).toBeUndefined();
    }
    const noHeader = await viaProxy(request(app).post('/api/auth/login'))
      .set('Origin', SITE)
      .send({ email: 'pm@example.test', password: TEST_PASSWORD });
    expect(noHeader.status).toBe(403);
  });

  it('grants no cross-origin (CORS) access: the browser only calls the API same-origin', async () => {
    for (const origin of [SITE, 'https://evil.example']) {
      const preflight = await viaProxy(request(app).options('/api/auth/login'))
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,x-pmo-request');
      expect(preflight.headers['access-control-allow-origin'], origin).toBeUndefined();
      expect(preflight.headers['access-control-allow-credentials'], origin).toBeUndefined();
    }
  });

  it('runs API-only on Render: the web app is served by Vercel', async () => {
    expect((await viaProxy(request(app).get('/api/health'))).status).toBe(200);
    const page = await viaProxy(request(app).get('/projects'));
    expect(page.status).toBe(404);
    expect(page.headers['content-type']).toMatch(/json/);
  });
});
