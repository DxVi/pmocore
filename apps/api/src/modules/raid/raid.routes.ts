import { Router } from 'express';
import {
  RaidItemCreateSchema,
  RaidItemListQuerySchema,
  RaidItemUpdateSchema,
} from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createRaidItem,
  deleteRaidItem,
  getRaidItem,
  listRaidItems,
  updateRaidItem,
} from './raid.service.js';

/**
 * Actions & RAID API (REQ-044–048). Mounted behind requireAuth, loadProject and
 * blockArchivedWrites; every query is scoped to the verified project.
 */
export const raidRouter = Router({ mergeParams: true });

raidRouter.get('/', async (req, res) => {
  const query = parseQuery(RaidItemListQuerySchema, req);
  const { items, meta } = await listRaidItems(getProject(req).id, query);
  sendSuccess(res, items, meta);
});

raidRouter.post('/', async (req, res) => {
  const input = parseBody(RaidItemCreateSchema, req);
  sendCreated(res, await createRaidItem(getProject(req).id, getAuth(req).userId, input));
});

raidRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getRaidItem(getProject(req).id, parseIdParam(req.params.id, 'RAID item')));
});

raidRouter.put('/:id', async (req, res) => {
  const input = parseBody(RaidItemUpdateSchema, req);
  const id = parseIdParam(req.params.id, 'RAID item');
  sendSuccess(res, await updateRaidItem(getProject(req).id, id, getAuth(req).userId, input));
});

raidRouter.delete('/:id', async (req, res) => {
  await deleteRaidItem(getProject(req).id, parseIdParam(req.params.id, 'RAID item'));
  sendSuccess(res, { deleted: true });
});
