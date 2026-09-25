import type { AuthUser } from '@pmocore/shared';
import type { ProjectRecord } from '../modules/access/project-access.service.js';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    /** Epoch milliseconds of login; enforces the absolute session lifetime. */
    createdAt: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. */
      auth?: { userId: string; user: AuthUser };
      /** Set by loadProject after the server-side project access check. */
      project?: ProjectRecord;
    }
  }
}

export {};
