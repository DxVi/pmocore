import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  API_ORIGIN_VARIABLE,
  WEB_SECURITY_HEADERS,
  apiOriginFrom,
  buildVercelConfig,
} from '../../../../vercel.mjs';

const API = 'https://pmocore-api.onrender.com';
const rootPackage = JSON.parse(
  readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> };

/** Vercel `source` patterns are path-to-regexp; these two are plain regular expressions. */
const matches = (source: string, path: string) => new RegExp(`^${source}$`).test(path);

describe('Vercel configuration (PMOCORE-DEPLOY-VERCEL)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('requires an https API origin and never guesses one', () => {
    expect(() => apiOriginFrom(undefined)).toThrow(/PMOCORE_API_ORIGIN is not set/);
    expect(() => apiOriginFrom('')).toThrow(/not set/);
    expect(() => apiOriginFrom('pmocore-api.onrender.com')).toThrow(/not a valid URL/);
    for (const bad of [
      'http://pmocore-api.onrender.com',
      `${API}/api`,
      `${API}?x=1`,
      'https://user:secret@pmocore-api.onrender.com',
    ]) {
      expect(() => apiOriginFrom(bad), bad).toThrow(/https origin only/);
    }
    expect(apiOriginFrom(`${API}/`)).toBe(API);
    expect(apiOriginFrom(` ${API} `)).toBe(API);
  });

  it('builds the web workspace from the repository root', () => {
    const config = buildVercelConfig({ [API_ORIGIN_VARIABLE]: API });
    expect(config).toMatchObject({
      framework: null,
      installCommand: 'npm ci',
      buildCommand: 'npm run build:web',
      outputDirectory: 'apps/web/dist',
    });
    expect(rootPackage.scripts['build:web']).toBe(
      'npm run build -w packages/shared && npm run build -w apps/web',
    );
  });

  it('proxies /api to the Render API before the client-routing fallback', () => {
    const { rewrites } = buildVercelConfig({ [API_ORIGIN_VARIABLE]: API });
    expect(rewrites[0]).toEqual({ source: '/api/:path*', destination: `${API}/api/:path*` });
    const fallback = rewrites[1];
    expect(fallback?.destination).toBe('/index.html');
    for (const path of ['/', '/login', '/projects/abc/meetings/def', '/dashboard']) {
      expect(matches(fallback?.source ?? '', path), path).toBe(true);
    }
    for (const path of ['/api/auth/me', '/api/projects/abc/attachments/def/content']) {
      expect(matches(fallback?.source ?? '', path), path).toBe(false);
    }
  });

  it('disables edge caching for the API and applies security headers only to the web app', () => {
    const { headers } = buildVercelConfig({ [API_ORIGIN_VARIABLE]: API });
    const api = headers.find((h) => h.source === '/api/:path*');
    expect(api?.headers).toEqual([{ key: 'x-vercel-enable-rewrite-caching', value: '0' }]);

    const web = headers.find((h) => h.headers === WEB_SECURITY_HEADERS);
    expect(matches(web?.source ?? '', '/projects/x')).toBe(true);
    // The API's own headers (e.g. the attachment CSP that lets PDFs open inline) are kept.
    expect(matches(web?.source ?? '', '/api/projects/x/attachments/y/content')).toBe(false);
    const csp = WEB_SECURITY_HEADERS.find((h) => h.key === 'Content-Security-Policy')?.value;
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it('exports the configuration Vercel reads from the project environment', async () => {
    vi.stubEnv(API_ORIGIN_VARIABLE, '');
    await expect(import('../../../../vercel.mjs')).rejects.toThrow(/not set/);

    vi.resetModules();
    vi.stubEnv(API_ORIGIN_VARIABLE, API);
    const { config } = await import('../../../../vercel.mjs');
    expect(config.rewrites[0]?.destination).toBe(`${API}/api/:path*`);
  });
});
