import type { Request, Response } from 'express';
import { sendError } from '../lib/api-response.js';

export function notFound(req: Request, res: Response) {
  sendError(res, 404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`);
}
