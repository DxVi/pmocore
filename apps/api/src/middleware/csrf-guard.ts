import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-pmo-request';

function requestOrigin(req: Request): string | undefined {
  const origin = req.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const referer = req.get('referer');
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

/**
 * CSRF defence in depth (design §4.2): SameSite=Lax session cookie, plus for
 * every state-changing request an allowed Origin (or Referer) and the custom
 * `X-PMO-Request: 1` header, which cross-site forms cannot send.
 */
export function csrfGuard(allowedOrigins: readonly string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = requestOrigin(req);
    if (!origin || !allowedOrigins.includes(origin) || req.get(CSRF_HEADER) !== '1') {
      throw new AppError(
        403,
        'CSRF_REJECTED',
        'Request was rejected by cross-site request protection',
      );
    }
    next();
  };
}
