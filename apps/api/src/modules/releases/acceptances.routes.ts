import { Router } from 'express';
import { AcceptanceUpdateSchema } from '@pmocore/shared';
import { sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import { deleteAcceptance, updateAcceptance } from './releases.service.js';

/**
 * Acceptances API (REQ-057, 073). Creation is under a release
 * (POST …/releases/:id/acceptances); this router updates and deletes records.
 */
export const acceptancesRouter = Router({ mergeParams: true });

const acceptanceId = (value: unknown) => parseIdParam(value, 'Acceptance');

acceptancesRouter.put('/:id', async (req, res) => {
  const input = parseBody(AcceptanceUpdateSchema, req);
  sendSuccess(
    res,
    await updateAcceptance(
      getProject(req).id,
      acceptanceId(req.params.id),
      getAuth(req).userId,
      input,
    ),
  );
});

acceptancesRouter.delete('/:id', async (req, res) => {
  await deleteAcceptance(getProject(req).id, acceptanceId(req.params.id));
  sendSuccess(res, { deleted: true });
});
