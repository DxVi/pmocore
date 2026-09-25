import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';
import { findActiveUser } from '../modules/auth/auth.service.js';
import { SESSION_ABSOLUTE_MS, destroySession } from '../modules/auth/session.js';

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');

/** Server-side authentication gate for every non-public API route (REQ-002). */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) throw unauthenticated();

  const createdAt = req.session.createdAt ?? 0;
  if (Date.now() - createdAt > SESSION_ABSOLUTE_MS) {
    await destroySession(req, res);
    throw unauthenticated();
  }

  const user = await findActiveUser(userId);
  if (!user) {
    await destroySession(req, res);
    throw unauthenticated();
  }

  req.auth = { userId, user };
  next();
}

/** Typed accessor for handlers mounted behind requireAuth. */
export function getAuth(req: Request) {
  if (!req.auth) throw unauthenticated();
  return req.auth;
}
