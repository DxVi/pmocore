import { Router } from 'express';
import {
  RequirementCreateSchema,
  RequirementListQuerySchema,
  RequirementUpdateSchema,
  RequirementWorkItemLinksSchema,
} from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  replaceRequirementWorkItems,
  updateRequirement,
} from './requirements.service.js';

/**
 * Requirements API (REQ-024–028, 069). Mounted behind requireAuth, loadProject
 * and blockArchivedWrites; every query is scoped to the verified project.
 */
export const requirementsRouter = Router({ mergeParams: true });

const requirementId = (value: unknown) => parseIdParam(value, 'Requirement');

requirementsRouter.get('/', async (req, res) => {
  const query = parseQuery(RequirementListQuerySchema, req);
  const { items, meta } = await listRequirements(getProject(req).id, query);
  sendSuccess(res, items, meta);
});

requirementsRouter.post('/', async (req, res) => {
  const input = parseBody(RequirementCreateSchema, req);
  sendCreated(res, await createRequirement(getProject(req).id, getAuth(req).userId, input));
});

requirementsRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getRequirement(getProject(req).id, requirementId(req.params.id)));
});

requirementsRouter.put('/:id', async (req, res) => {
  const input = parseBody(RequirementUpdateSchema, req);
  sendSuccess(
    res,
    await updateRequirement(
      getProject(req).id,
      requirementId(req.params.id),
      getAuth(req).userId,
      input,
    ),
  );
});

requirementsRouter.delete('/:id', async (req, res) => {
  await deleteRequirement(getProject(req).id, requirementId(req.params.id));
  sendSuccess(res, { deleted: true });
});

requirementsRouter.put('/:id/work-items', async (req, res) => {
  const { workItemIds } = parseBody(RequirementWorkItemLinksSchema, req);
  sendSuccess(
    res,
    await replaceRequirementWorkItems(
      getProject(req).id,
      requirementId(req.params.id),
      getAuth(req).userId,
      workItemIds,
    ),
  );
});
