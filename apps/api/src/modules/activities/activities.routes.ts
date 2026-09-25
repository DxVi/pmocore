import { Router } from 'express';
import {
  ActivityCreateSchema,
  ActivityListQuerySchema,
  ActivityUpdateSchema,
  FollowUpActionsRequestSchema,
} from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  addFollowUps,
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  updateActivity,
} from './activities.service.js';

/**
 * Meetings & Visits API (REQ-029–034, 068). Mounted behind requireAuth,
 * loadProject and blockArchivedWrites; every query is scoped to the verified project.
 */
export const activitiesRouter = Router({ mergeParams: true });

const activityId = (value: unknown) => parseIdParam(value, 'Meeting / visit');

activitiesRouter.get('/', async (req, res) => {
  const query = parseQuery(ActivityListQuerySchema, req);
  const { items, meta } = await listActivities(getProject(req).id, query);
  sendSuccess(res, items, meta);
});

activitiesRouter.post('/', async (req, res) => {
  const input = parseBody(ActivityCreateSchema, req);
  sendCreated(res, await createActivity(getProject(req).id, getAuth(req).userId, input));
});

activitiesRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getActivity(getProject(req).id, activityId(req.params.id)));
});

activitiesRouter.put('/:id', async (req, res) => {
  const input = parseBody(ActivityUpdateSchema, req);
  sendSuccess(
    res,
    await updateActivity(getProject(req).id, activityId(req.params.id), getAuth(req).userId, input),
  );
});

activitiesRouter.delete('/:id', async (req, res) => {
  await deleteActivity(getProject(req).id, activityId(req.params.id), getAuth(req).userId);
  sendSuccess(res, { deleted: true });
});

activitiesRouter.post('/:id/actions', async (req, res) => {
  const request = parseBody(FollowUpActionsRequestSchema, req);
  sendCreated(
    res,
    await addFollowUps(getProject(req).id, activityId(req.params.id), getAuth(req).userId, request),
  );
});
