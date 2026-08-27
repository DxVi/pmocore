import type { Response } from 'express';
import type { PaginationMeta } from '@pmocore/shared';

export function sendSuccess<T>(res: Response, data: T, meta?: PaginationMeta) {
  return res.status(200).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}
