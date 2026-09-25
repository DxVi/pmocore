import type { Request, Response } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '@pmocore/database';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/**
 * Server-side sessions persisted in PostgreSQL (design §4.2, DS-01).
 * The `session` table is created by our migration, not by the store.
 */
export const SESSION_COOKIE_NAME = 'pmo_sid';
const DAY_MS = 24 * 60 * 60 * 1000;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export const SESSION_ABSOLUTE_MS = env.SESSION_ABSOLUTE_DAYS * DAY_MS;

const PgStore = connectPgSimple(session);

const toError = (err: unknown) => (err instanceof Error ? err : new Error(String(err)));

export function createSessionMiddleware() {
  return session({
    name: SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PgStore({
      pool,
      tableName: 'session',
      createTableIfMissing: false,
      // Periodic pruning is unnecessary in tests and would keep timers alive.
      pruneSessionInterval: env.NODE_ENV === 'test' ? false : 15 * 60,
      errorLog: (message: string) => logger.error({ component: 'session-store' }, message),
    }),
    cookie: { ...sessionCookieOptions, maxAge: env.SESSION_IDLE_DAYS * DAY_MS },
  });
}

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(toError(err)) : resolve())),
  );
}

export function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.save((err) => (err ? reject(toError(err)) : resolve())),
  );
}

export function destroySession(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
      return err ? reject(toError(err)) : resolve();
    });
  });
}
