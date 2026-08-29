import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { createLoggerOptions, REDACT_CENSOR } from '../lib/logger.js';

// Entirely synthetic — never a real cookie, token, or credential.
const FAKE_COOKIE = 'session=synthetic-fake-session-token-do-not-use';
const FAKE_AUTHORIZATION = 'Bearer synthetic-fake-bearer-token-do-not-use';
const FAKE_SET_COOKIE = 'session=synthetic-fake-response-cookie; HttpOnly';

/**
 * A pino destination is any object with a synchronous write(str) method —
 * this is pino's own documented minimal destination interface. Using it
 * (rather than trying to intercept the production logger's default
 * stdout/fd-based destination, which several probes showed pino binds in a
 * way that isn't reliably interceptable in this test-runner environment)
 * keeps the test deterministic while still exercising the real, exported
 * REDACT_PATHS/REDACT_CENSOR values — not a hand-typed duplicate of them.
 */
function createCapturingDestination() {
  const lines: string[] = [];
  return {
    write: (msg: string) => {
      lines.push(msg);
    },
    entries: (): Array<Record<string, unknown>> =>
      lines.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe('base Pino logger redaction (the actual production REDACT_PATHS/REDACT_CENSOR)', () => {
  it('redacts req.headers.cookie, req.headers.authorization, and res.headers["set-cookie"]', () => {
    const destination = createCapturingDestination();
    // Same complete, authoritative options the production singleton is built
    // from — only the destination differs. If `redact` were ever removed
    // from createLoggerOptions(), this test would start failing too.
    const testLogger = pino(createLoggerOptions(), destination);

    // createLoggerOptions() sets `level` from the test environment's
    // LOG_LEVEL ('error', to keep other test output quiet), so this uses
    // `.error()` rather than `.info()` to clear that threshold — the level
    // a message is logged at is unrelated to redaction, which applies
    // identically at every level. The exact object shape below is what
    // pino-http's own serializers produce (verified against the installed
    // pino-http version): { req: { headers }, res: { headers } }.
    testLogger.error(
      {
        req: {
          method: 'GET',
          url: '/api/health',
          headers: { cookie: FAKE_COOKIE, authorization: FAKE_AUTHORIZATION },
        },
        res: {
          statusCode: 200,
          headers: { 'set-cookie': [FAKE_SET_COOKIE] },
        },
        responseTime: 12,
      },
      'request completed',
    );

    const [entry] = destination.entries();
    expect(entry).toBeDefined();

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain(FAKE_COOKIE);
    expect(serialized).not.toContain(FAKE_AUTHORIZATION);
    expect(serialized).not.toContain(FAKE_SET_COOKIE);
    expect(serialized).toContain(REDACT_CENSOR);

    const req = entry.req as Record<string, unknown>;
    const res = entry.res as Record<string, unknown>;
    expect((req.headers as Record<string, unknown>).cookie).toBe(REDACT_CENSOR);
    expect((req.headers as Record<string, unknown>).authorization).toBe(REDACT_CENSOR);
    expect((res.headers as Record<string, unknown>)['set-cookie']).toBe(REDACT_CENSOR);

    // Non-sensitive fields are preserved, not swept up by redaction.
    expect(req.method).toBe('GET');
    expect(req.url).toBe('/api/health');
    expect(res.statusCode).toBe(200);
    expect(entry.responseTime).toBe(12);
  });
});

describe('pino-http integration with the production redaction configuration', () => {
  it('redacts a real HTTP request/response carrying Cookie/Authorization/Set-Cookie while preserving operational fields', async () => {
    const destination = createCapturingDestination();
    // Same pino-http import and the same complete, authoritative options
    // (createLoggerOptions()) the production singleton is built from — only
    // the destination differs, so this is a faithful test of the real
    // serialization + redaction pipeline for an actual request, not a
    // hand-fabricated log object or reconstructed settings. No production
    // route is added; this Express app exists only inside this test file.
    const testLogger = pino(createLoggerOptions(), destination);

    const app = express();
    // useLevel: 'error' clears createLoggerOptions()'s test-environment level
    // threshold (LOG_LEVEL=error) so the completed-request log is actually
    // emitted; pino-http supports this natively — it doesn't touch redaction.
    app.use(pinoHttp({ logger: testLogger, useLevel: 'error' }));
    app.get('/probe', (_req, res) => {
      res.setHeader('Set-Cookie', FAKE_SET_COOKIE);
      res.status(200).json({ ok: true });
    });

    await request(app)
      .get('/probe')
      .set('Cookie', FAKE_COOKIE)
      .set('Authorization', FAKE_AUTHORIZATION);

    const requestLogLine = destination.entries().find((entry) => entry.req !== undefined);
    expect(requestLogLine).toBeDefined();

    const serialized = JSON.stringify(requestLogLine);
    expect(serialized).not.toContain(FAKE_COOKIE);
    expect(serialized).not.toContain(FAKE_AUTHORIZATION);
    expect(serialized).not.toContain(FAKE_SET_COOKIE);
    expect(serialized).toContain(REDACT_CENSOR);

    const req = requestLogLine!.req as Record<string, unknown>;
    const res = requestLogLine!.res as Record<string, unknown>;
    expect((req.headers as Record<string, unknown>).cookie).toBe(REDACT_CENSOR);
    expect((req.headers as Record<string, unknown>).authorization).toBe(REDACT_CENSOR);
    expect((res.headers as Record<string, unknown>)['set-cookie']).toBe(REDACT_CENSOR);

    // Non-sensitive fields are preserved.
    expect(req.method).toBe('GET');
    expect(String(req.url)).toContain('/probe');
    expect(res.statusCode).toBe(200);
    expect(requestLogLine!.responseTime).toBeTypeOf('number');
  });
});
