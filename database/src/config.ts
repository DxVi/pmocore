import { z } from 'zod';

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.enum(['require', 'disable']).default('require'),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type SslOption = { rejectUnauthorized: false } | false;

// SSL-control parameters that would compete with DATABASE_SSL as an authority.
// pg (via pg-connection-string) honors these when present in the URL, which can
// defeat an explicit `ssl` option — so their presence in DATABASE_URL is rejected.
const PROHIBITED_SSL_PARAMS = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'];

/**
 * Reject any DATABASE_URL that carries SSL-control parameters (case-insensitive).
 * This guarantees DATABASE_SSL is the sole SSL authority. The error names only
 * the offending key(s) — never the URL, host, credentials, database name, or
 * parameter values (secret-safe). No stripping, normalization, or silent
 * rewriting is performed; standard Node `URL`/`URLSearchParams` parsing is
 * used, so no new production dependency is introduced.
 */
function assertNoUrlSslParams(rawUrl: string): void {
  const params = new URL(rawUrl).searchParams;
  const offending = PROHIBITED_SSL_PARAMS.filter((key) => {
    for (const name of params.keys()) {
      if (name.toLowerCase() === key) return true;
    }
    return false;
  });

  if (offending.length > 0) {
    throw new Error(
      `DATABASE_URL must not contain SSL parameters: ${offending.join(', ')}. ` +
        `SSL is controlled exclusively by DATABASE_SSL.`,
    );
  }
}

/**
 * 'require' preserves the previously approved, unconditional Neon-compatible
 * behavior. 'disable' allows local PostgreSQL servers without SSL. This is
 * the only place SSL mode is decided — never inferred from NODE_ENV, the
 * database hostname, or connection-string heuristics.
 */
export function resolveSslOption(mode: DatabaseEnv['DATABASE_SSL']): SslOption {
  return mode === 'require' ? { rejectUnauthorized: false } : false;
}

export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = databaseEnvSchema.parse(env);
  assertNoUrlSslParams(parsed.DATABASE_URL);

  return {
    connectionString: parsed.DATABASE_URL,
    ssl: resolveSslOption(parsed.DATABASE_SSL),
  };
}

export const databaseConfig = loadDatabaseConfig();
