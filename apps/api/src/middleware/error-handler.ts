import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';
import { sendError } from '../lib/api-response.js';
import { mapDatabaseError } from '../lib/db-errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

/** Client errors raised by Express/body-parser (e.g. malformed JSON, oversized body). */
function mapHttpClientError(err: unknown): AppError | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const { status, type } = err as { status?: unknown; type?: unknown };
  if (typeof status !== 'number' || status < 400 || status >= 500) return undefined;
  if (status === 413) return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (type === 'entity.parse.failed') {
    return new AppError(400, 'VALIDATION_ERROR', 'Request body is not valid JSON');
  }
  return new AppError(status, 'BAD_REQUEST', 'The request could not be processed');
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const known = err instanceof AppError ? err : (mapDatabaseError(err) ?? mapHttpClientError(err));

  if (known) {
    sendError(res, known.statusCode, known.code, known.message, known.details);
    return;
  }

  logger.error(err, 'Unhandled error');

  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err instanceof Error
        ? err.message
        : 'Unknown error';

  sendError(res, 500, 'INTERNAL_ERROR', message);
}
