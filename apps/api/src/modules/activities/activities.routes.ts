import { Router } from 'express';

/**
 * Meetings & Visits API (REQ-029–034) — placeholder registered by PKG-1 (tasks.md §3.3).
 * Implemented by PKG-2 inside this module directory only. Mounted behind
 * requireAuth, loadProject and blockArchivedWrites; read the verified project
 * with getProject(req) and the actor with getAuth(req).
 */
export const activitiesRouter = Router({ mergeParams: true });
