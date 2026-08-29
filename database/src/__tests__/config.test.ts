import { describe, expect, it } from 'vitest';
import { loadDatabaseConfig, resolveSslOption } from '../config.js';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/pmocore_test';

describe('loadDatabaseConfig', () => {
  it('defaults to require when DATABASE_SSL is unset', () => {
    const config = loadDatabaseConfig({ DATABASE_URL });

    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('maps an explicit "require" to rejectUnauthorized: false', () => {
    const config = loadDatabaseConfig({ DATABASE_URL, DATABASE_SSL: 'require' });

    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('maps an explicit "disable" to false', () => {
    const config = loadDatabaseConfig({ DATABASE_URL, DATABASE_SSL: 'disable' });

    expect(config.ssl).toBe(false);
  });

  it('fails clearly on an invalid DATABASE_SSL value', () => {
    expect(() => loadDatabaseConfig({ DATABASE_URL, DATABASE_SSL: 'maybe' })).toThrow();
  });

  it('carries the connection string through unchanged', () => {
    const config = loadDatabaseConfig({ DATABASE_URL, DATABASE_SSL: 'disable' });

    expect(config.connectionString).toBe(DATABASE_URL);
  });
});

describe('resolveSslOption', () => {
  it('returns { rejectUnauthorized: false } for "require"', () => {
    expect(resolveSslOption('require')).toEqual({ rejectUnauthorized: false });
  });

  it('returns false for "disable"', () => {
    expect(resolveSslOption('disable')).toBe(false);
  });
});

describe('loadDatabaseConfig — DATABASE_URL SSL-parameter rejection', () => {
  // Entirely synthetic host/credentials — never a real connection target.
  const HOST = 'db.internal.example';
  const USER = 'synthetic-user';
  const PASSWORD = 'synthetic-password';
  const DB_NAME = 'synthetic_db';
  const BASE_URL = `postgresql://${USER}:${PASSWORD}@${HOST}:5432/${DB_NAME}`;

  it.each(['sslmode', 'sslcert', 'sslkey', 'sslrootcert'])(
    'rejects a DATABASE_URL containing "%s"',
    (param) => {
      const url = `${BASE_URL}?${param}=require`;

      expect(() => loadDatabaseConfig({ DATABASE_URL: url })).toThrow();
    },
  );

  it('rejects a mixed-case SSL parameter name (case-insensitive match)', () => {
    const url = `${BASE_URL}?SSLMode=require`;

    expect(() => loadDatabaseConfig({ DATABASE_URL: url })).toThrow();
  });

  it('rejects a DATABASE_URL carrying multiple prohibited parameters at once', () => {
    const url = `${BASE_URL}?sslmode=verify-full&sslrootcert=%2Fpath%2Fto%2Fca.pem`;

    expect(() => loadDatabaseConfig({ DATABASE_URL: url })).toThrow();
  });

  it('does not strip or normalize the URL — it throws rather than silently rewriting', () => {
    const url = `${BASE_URL}?sslmode=require`;

    // The rejection is the only observable behavior; there is no "sanitized"
    // config returned for a URL that carries SSL parameters.
    expect(() => loadDatabaseConfig({ DATABASE_URL: url })).toThrow();
  });

  it('error message is secret-safe: no full URL, host, credentials, or database name', () => {
    const url = `${BASE_URL}?sslmode=require&sslcert=%2Fetc%2Fcerts%2Fclient.crt`;

    try {
      loadDatabaseConfig({ DATABASE_URL: url });
      throw new Error('expected loadDatabaseConfig to throw');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).not.toContain(url);
      expect(message).not.toContain(HOST);
      expect(message).not.toContain(USER);
      expect(message).not.toContain(PASSWORD);
      expect(message).not.toContain(DB_NAME);
      expect(message).not.toContain('/etc/certs/client.crt');
      // The error MAY name the offending parameter keys.
      expect(message).toContain('sslmode');
      expect(message).toContain('sslcert');
    }
  });

  it('accepts a DATABASE_URL with no SSL parameters under DATABASE_SSL=disable', () => {
    const config = loadDatabaseConfig({ DATABASE_URL: BASE_URL, DATABASE_SSL: 'disable' });

    expect(config.ssl).toBe(false);
    expect(config.connectionString).toBe(BASE_URL);
  });

  it('accepts a DATABASE_URL with no SSL parameters under the default (require)', () => {
    const config = loadDatabaseConfig({ DATABASE_URL: BASE_URL });

    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });
});
