import { Router } from 'express';
import {
  AcceptanceCreateSchema,
  ReleaseCreateSchema,
  ReleaseDefectsScopeSchema,
  ReleaseListQuerySchema,
  ReleaseRequirementsScopeSchema,
  ReleaseUpdateSchema,
} from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createAcceptance,
  createRelease,
  deleteRelease,
  getRelease,
  listReleases,
  replaceReleaseDefects,
  replaceReleaseRequirements,
  updateRelease,
} from './releases.service.js';

/**
 * Releases API (REQ-054–058, 072–073). Mounted behind requireAuth, loadProject
 * and blockArchivedWrites; every query is scoped to the verified project.
 */
export const releasesRouter = Router({ mergeParams: true });

const releaseId = (value: unknown) => parseIdParam(value, 'Release');

releasesRouter.get('/', async (req, res) => {
  const { items, meta } = await listReleases(
    getProject(req).id,
    parseQuery(ReleaseListQuerySchema, req),
  );
  sendSuccess(res, items, meta);
});

releasesRouter.post('/', async (req, res) => {
  const input = parseBody(ReleaseCreateSchema, req);
  sendCreated(res, await createRelease(getProject(req).id, getAuth(req).userId, input));
});

releasesRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getRelease(getProject(req).id, releaseId(req.params.id)));
});

releasesRouter.put('/:id', async (req, res) => {
  const input = parseBody(ReleaseUpdateSchema, req);
  sendSuccess(
    res,
    await updateRelease(getProject(req).id, releaseId(req.params.id), getAuth(req).userId, input),
  );
});

releasesRouter.delete('/:id', async (req, res) => {
  await deleteRelease(getProject(req).id, releaseId(req.params.id));
  sendSuccess(res, { deleted: true });
});

releasesRouter.put('/:id/requirements', async (req, res) => {
  const scope = parseBody(ReleaseRequirementsScopeSchema, req);
  sendSuccess(
    res,
    await replaceReleaseRequirements(
      getProject(req).id,
      releaseId(req.params.id),
      getAuth(req).userId,
      scope,
    ),
  );
});

releasesRouter.put('/:id/defects', async (req, res) => {
  const scope = parseBody(ReleaseDefectsScopeSchema, req);
  sendSuccess(
    res,
    await replaceReleaseDefects(
      getProject(req).id,
      releaseId(req.params.id),
      getAuth(req).userId,
      scope,
    ),
  );
});

releasesRouter.post('/:id/acceptances', async (req, res) => {
  const input = parseBody(AcceptanceCreateSchema, req);
  sendCreated(
    res,
    await createAcceptance(
      getProject(req).id,
      releaseId(req.params.id),
      getAuth(req).userId,
      input,
    ),
  );
});
