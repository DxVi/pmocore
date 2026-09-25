import { Router } from 'express';
import { env } from '../config/env.js';
import { csrfGuard } from '../middleware/csrf-guard.js';
import { requireAuth } from '../middleware/require-auth.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { createSessionMiddleware } from '../modules/auth/session.js';
import { healthRouter } from './health.js';

/**
 * API route registration. Public: health and auth. Everything registered after
 * `requireAuth` is protected server-side (REQ-002).
 */
export function createApiRouter() {
  const router = Router();

  router.use('/health', healthRouter);

  router.use(createSessionMiddleware());
  router.use(csrfGuard(env.appOrigins));
  router.use('/auth', createAuthRouter());

  router.use(requireAuth);

  return router;
}
