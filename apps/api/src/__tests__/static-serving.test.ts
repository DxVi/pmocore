import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { todayInTimeZone } from '../lib/today.js';

describe('production web serving (D-005)', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'pmocore-web-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><div id="root"></div>');
    writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(1);');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves hashed assets with long-lived caching', async () => {
    const res = await request(createApp({ webDistPath: dir })).get('/assets/app-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/immutable/);
  });

  it('falls back to index.html for client-side routes without caching it', async () => {
    const res = await request(createApp({ webDistPath: dir })).get('/projects/abc/meetings');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('never answers API paths or missing assets with the web app', async () => {
    const app = createApp({ webDistPath: dir });
    const api = await request(app).get('/api/does-not-exist');
    expect(api.headers['content-type']).toMatch(/json/);
    const asset = await request(app).get('/assets/missing.js');
    expect(asset.status).toBe(404);
  });
});

describe('business date', () => {
  it('evaluates "today" in Asia/Manila', () => {
    // 2026-10-12T16:30Z is already 2026-10-13 00:30 in Manila (UTC+8).
    expect(todayInTimeZone('Asia/Manila', new Date('2026-10-12T16:30:00Z'))).toBe('2026-10-13');
    expect(todayInTimeZone('UTC', new Date('2026-10-12T16:30:00Z'))).toBe('2026-10-12');
  });
});
