import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { HealthResponseSchema } from '@pmocore/shared';
import { pool } from '@pmocore/database';
import { app } from '../app.js';

// supertest types `Response.body` as `any` (it's arbitrary parsed JSON), so we
// assert the envelope shape once at this boundary instead of accessing `.data`
// off an untyped value at every call site.
interface ApiEnvelope {
  success: boolean;
  data: unknown;
}

describe('GET /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a 200 success envelope with status healthy and database connected', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [{ '?column?': 1 }] } as never);

    const response = await request(app).get('/api/health');
    const body = response.body as ApiEnvelope;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const health = HealthResponseSchema.parse(body.data);
    expect(health.status).toBe('healthy');
    expect(health.database).toBe('connected');
    expect(health.timestamp).toBeTruthy();
    expect(health.version).toBeTruthy();
  });

  it('returns a 200 success envelope with status degraded and database disconnected, without leaking error details, when the database is unreachable', async () => {
    vi.spyOn(pool, 'query').mockRejectedValueOnce(
      new Error('connection refused at db.internal:5432 user=admin'),
    );

    const response = await request(app).get('/api/health');
    const body = response.body as ApiEnvelope;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const health = HealthResponseSchema.parse(body.data);
    expect(health.status).toBe('degraded');
    expect(health.database).toBe('disconnected');
    expect(health.timestamp).toBeTruthy();
    expect(health.version).toBeTruthy();

    const rawResponse = JSON.stringify(response.body);
    expect(rawResponse).not.toContain('connection refused');
    expect(rawResponse).not.toContain('db.internal');
    expect(rawResponse).not.toContain('5432');
  });
});
