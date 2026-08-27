import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';
import { sendError } from '../lib/api-response.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
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
