import { Router } from 'express';
import { env } from '../config/env.js';
import { csrfGuard } from '../middleware/csrf-guard.js';
import { blockArchivedWrites, loadProject } from '../middleware/load-project.js';
import { requireAuth } from '../middleware/require-auth.js';
import { activitiesRouter } from '../modules/activities/activities.routes.js';
import { attachmentsRouter } from '../modules/attachments/attachments.routes.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { createSessionMiddleware } from '../modules/auth/session.js';
import { dashboardRouter, projectMetricsRouter } from '../modules/dashboard/dashboard.routes.js';
import { documentsRouter } from '../modules/documents/documents.routes.js';
import { lookupRouter } from '../modules/lookup/lookup.routes.js';
import { projectsRouter } from '../modules/projects/projects.routes.js';
import { raidRouter } from '../modules/raid/raid.routes.js';
import { referenceRouter } from '../modules/reference-data/reference.routes.js';
import { acceptancesRouter } from '../modules/releases/acceptances.routes.js';
import { releasesRouter } from '../modules/releases/releases.routes.js';
import { requirementsRouter } from '../modules/requirements/requirements.routes.js';
import { defectsRouter } from '../modules/testing/defects.routes.js';
import { testsRouter } from '../modules/testing/tests.routes.js';
import { workItemsRouter } from '../modules/work-items/work-items.routes.js';
import { healthRouter } from './health.js';

/**
 * API route registration — frozen by PKG-1 for parallel work (tasks.md §3.3).
 * Public: health and auth. Everything registered after `requireAuth` is
 * protected server-side (REQ-002). Project-scoped module routers are mounted
 * behind the project access check and the archived-project write guard.
 */
export function createApiRouter() {
  const router = Router();

  router.use('/health', healthRouter);

  router.use(createSessionMiddleware());
  router.use(csrfGuard(env.appOrigins));
  router.use('/auth', createAuthRouter());

  router.use(requireAuth);

  router.use('/reference-data', referenceRouter);
  router.use('/dashboard', dashboardRouter);
  router.use('/projects', projectsRouter);

  const projectScoped = Router({ mergeParams: true });
  projectScoped.use(loadProject, blockArchivedWrites);
  projectScoped.use('/lookup', lookupRouter);
  projectScoped.use('/metrics', projectMetricsRouter);
  projectScoped.use('/work-items', workItemsRouter);
  projectScoped.use('/requirements', requirementsRouter);
  projectScoped.use('/activities', activitiesRouter);
  projectScoped.use('/raid-items', raidRouter);
  projectScoped.use('/tests', testsRouter);
  projectScoped.use('/defects', defectsRouter);
  projectScoped.use('/releases', releasesRouter);
  projectScoped.use('/acceptances', acceptancesRouter);
  projectScoped.use('/documents', documentsRouter);
  projectScoped.use('/attachments', attachmentsRouter);
  router.use('/projects/:projectId', projectScoped);

  return router;
}
