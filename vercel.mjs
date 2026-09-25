/**
 * Vercel project configuration (PMOCORE-DEPLOY-VERCEL). Vercel project Root
 * Directory: the repository root (npm workspaces are installed from here).
 *
 * The browser only ever talks to the Vercel origin. `/api/*` is proxied to the
 * Express API on Render, so the PostgreSQL-backed session cookie stays a
 * first-party, HttpOnly, SameSite=Lax cookie and the Origin + X-PMO-Request
 * CSRF checks are unchanged. Everything else is the static React build with a
 * client-side routing fallback to index.html.
 *
 * PMOCORE_API_ORIGIN (Vercel project environment variable, e.g.
 * https://pmocore-api.onrender.com) is required: the build fails rather than
 * proxying sign-ins to a guessed host.
 */

export const API_ORIGIN_VARIABLE = 'PMOCORE_API_ORIGIN';

// Same policy the API applied when it served the web app itself (helmet defaults).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' https: 'unsafe-inline'",
  'upgrade-insecure-requests',
].join('; ');

export const WEB_SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
];

/** Validates the API origin: https, no path, query or credentials. */
export function apiOriginFrom(value) {
  const help = `${API_ORIGIN_VARIABLE} must be the https origin of the Render API, e.g. https://pmocore-api.onrender.com`;
  if (!value) throw new Error(`${API_ORIGIN_VARIABLE} is not set. ${help}`);
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${API_ORIGIN_VARIABLE} is not a valid URL. ${help}`);
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error(`${API_ORIGIN_VARIABLE} must be an https origin only. ${help}`);
  }
  return url.origin;
}

export function buildVercelConfig(env) {
  const apiOrigin = apiOriginFrom(env[API_ORIGIN_VARIABLE]);
  return {
    framework: null,
    installCommand: 'npm ci',
    buildCommand: 'npm run build:web',
    outputDirectory: 'apps/web/dist',
    rewrites: [
      // First match wins: the API proxy must precede the client-routing fallback.
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
      { source: '/((?!api/).*)', destination: '/index.html' },
    ],
    headers: [
      {
        // Per-user API responses are never cached at Vercel's edge.
        source: '/api/:path*',
        headers: [{ key: 'x-vercel-enable-rewrite-caching', value: '0' }],
      },
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // API responses keep the API's own headers (e.g. the attachment CSP).
      { source: '/((?!api/).*)', headers: WEB_SECURITY_HEADERS },
    ],
  };
}

export const config = buildVercelConfig(process.env);
