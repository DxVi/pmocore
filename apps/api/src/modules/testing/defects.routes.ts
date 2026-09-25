import { Router } from 'express';
import { DefectCreateSchema, DefectListQuerySchema, DefectUpdateSchema } from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createDefect,
  deleteDefect,
  getDefect,
  listDefects,
  updateDefect,
} from './testing.service.js';

/**
 * Defects API (REQ-051–052, 071). Mounted behind requireAuth, loadProject and
 * blockArchivedWrites; every query is scoped to the verified project.
 */
export const defectsRouter = Router({ mergeParams: true });

const defectId = (value: unknown) => parseIdParam(value, 'Defect');

defectsRouter.get('/', async (req, res) => {
  const { items, meta } = await listDefects(
    getProject(req).id,
    parseQuery(DefectListQuerySchema, req),
  );
  sendSuccess(res, items, meta);
});

defectsRouter.post('/', async (req, res) => {
  const input = parseBody(DefectCreateSchema, req);
  sendCreated(res, await createDefect(getProject(req).id, getAuth(req).userId, input));
});

defectsRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getDefect(getProject(req).id, defectId(req.params.id)));
});

defectsRouter.put('/:id', async (req, res) => {
  const input = parseBody(DefectUpdateSchema, req);
  sendSuccess(
    res,
    await updateDefect(getProject(req).id, defectId(req.params.id), getAuth(req).userId, input),
  );
});

defectsRouter.delete('/:id', async (req, res) => {
  await deleteDefect(getProject(req).id, defectId(req.params.id));
  sendSuccess(res, { deleted: true });
});
