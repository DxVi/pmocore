import { Router } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import { getDashboard, getProjectMetrics } from './dashboard.service.js';

/** Dashboard API (REQ-006–011). Mounted behind requireAuth at /api/dashboard. */
export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res) => {
  sendSuccess(res, await getDashboard(getAuth(req).userId));
});

/**
 * Derived metrics for one project's overview (REQ-017/018). Mounted at
 * /api/projects/:projectId/metrics behind the project access check.
 */
export const projectMetricsRouter = Router({ mergeParams: true });

projectMetricsRouter.get('/', async (req, res) => {
  sendSuccess(res, await getProjectMetrics(getProject(req)));
});
