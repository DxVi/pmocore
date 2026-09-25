import { Router } from 'express';

/**
 * Test cases API (REQ-049–053) — placeholder registered by PKG-1 (tasks.md §3.3).
 * Implemented by PKG-3 inside this module directory only. Mounted behind
 * requireAuth, loadProject and blockArchivedWrites; read the verified project
 * with getProject(req) and the actor with getAuth(req).
 */
export const testsRouter = Router({ mergeParams: true });
