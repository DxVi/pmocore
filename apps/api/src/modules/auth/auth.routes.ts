import { Router, type Request } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { LoginRequestSchema } from '@pmocore/shared';
import { AppError } from '../../lib/app-error.js';
import { sendError, sendSuccess } from '../../lib/api-response.js';
import { requireAuth, getAuth } from '../../middleware/require-auth.js';
import { parseBody } from '../../lib/validate.js';
import { authenticate } from './auth.service.js';
import { destroySession, regenerateSession, saveSession } from './session.js';

const WINDOW_MS = 15 * 60 * 1000;

const clientKey = (req: Request) => ipKeyGenerator(req.ip ?? 'unknown', 56);

const loginEmail = (req: Request) => {
  const body = req.body as { email?: unknown } | undefined;
  return typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
};

const limiterDefaults: Partial<Options> = {
  windowMs: WINDOW_MS,
  // Only failed attempts (HTTP status >= 400) count toward the limits.
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(res, 429, 'RATE_LIMITED', 'Too many login attempts. Please wait and try again.'),
};

/**
 * Login throttling (design §4.2): 5 failed attempts per IP+email and 50 per IP
 * within 15 minutes. In-memory store — valid for the single-instance deployment.
 * Created per app instance so tests and restarts start with clean counters.
 */
export function createAuthRouter() {
  const router = Router();

  const perAccount = rateLimit({
    ...limiterDefaults,
    limit: 5,
    keyGenerator: (req) => `${clientKey(req)}|${loginEmail(req)}`,
  });
  const perClient = rateLimit({ ...limiterDefaults, limit: 50, keyGenerator: clientKey });

  router.post('/login', perClient, perAccount, async (req, res) => {
    const { email, password } = parseBody(LoginRequestSchema, req);
    const user = await authenticate(email, password);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // New session ID at login prevents session fixation.
    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.createdAt = Date.now();
    await saveSession(req);

    sendSuccess(res, { user });
  });

  router.post('/logout', async (req, res) => {
    await destroySession(req, res);
    sendSuccess(res, { loggedOut: true });
  });

  router.get('/me', requireAuth, (req, res) => {
    sendSuccess(res, { user: getAuth(req).user });
  });

  return router;
}
