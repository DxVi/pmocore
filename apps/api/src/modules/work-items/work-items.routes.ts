import { Router } from 'express';
import {
  WorkItemCreateSchema,
  WorkItemListQuerySchema,
  WorkItemUpdateSchema,
} from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createWorkItem,
  deleteWorkItem,
  getWorkItem,
  listWorkItems,
  updateWorkItem,
} from './work-items.service.js';

/**
 * Project Plan / Work Items API (REQ-019–023). Mounted behind requireAuth,
 * loadProject and blockArchivedWrites; every query is scoped to the verified project.
 */
export const workItemsRouter = Router({ mergeParams: true });

const itemId = (value: unknown) => parseIdParam(value, 'Work item');

workItemsRouter.get('/', async (req, res) => {
  const { items, meta } = await listWorkItems(
    getProject(req).id,
    parseQuery(WorkItemListQuerySchema, req),
  );
  sendSuccess(res, items, meta);
});

workItemsRouter.post('/', async (req, res) => {
  const input = parseBody(WorkItemCreateSchema, req);
  sendCreated(res, await createWorkItem(getProject(req).id, getAuth(req).userId, input));
});

workItemsRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getWorkItem(getProject(req).id, itemId(req.params.id)));
});

workItemsRouter.put('/:id', async (req, res) => {
  const input = parseBody(WorkItemUpdateSchema, req);
  sendSuccess(
    res,
    await updateWorkItem(getProject(req).id, itemId(req.params.id), getAuth(req).userId, input),
  );
});

workItemsRouter.delete('/:id', async (req, res) => {
  await deleteWorkItem(getProject(req).id, itemId(req.params.id));
  sendSuccess(res, { deleted: true });
});
