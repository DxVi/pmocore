import pino from 'pino';
import { env } from '../config/env.js';

// Redaction paths correspond to how pino-http serializes requests/responses:
// the serialized request is nested under `req` (headers under `req.headers`)
// and the response under `res` (headers under `res.headers`). Centralized here
// so future secret-bearing headers can be added in one place.
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
];
export const REDACT_CENSOR = '[Redacted]';

/**
 * The complete, authoritative Pino options for this application — level,
 * redaction, and transport. Both the production `logger` singleton below and
 * the redaction tests construct their logger from this exact function, so a
 * logger built without it (or with `redact` removed here) cannot exist:
 * tests exercise this factory directly rather than reconstructing an
 * approximation of it, so removing redaction from production would also
 * remove it from whatever logger the tests build.
 */
export function createLoggerOptions(): pino.LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR },
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  };
}

export const logger = pino(createLoggerOptions());
