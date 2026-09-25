import { Router } from 'express';
import {
  TestCaseCreateSchema,
  TestCaseListQuerySchema,
  TestCaseUpdateSchema,
} from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createTestCase,
  deleteTestCase,
  getTestCase,
  listTestCases,
  updateTestCase,
} from './testing.service.js';

/**
 * Test cases API (REQ-049–053, 070). Mounted behind requireAuth, loadProject and
 * blockArchivedWrites; every query is scoped to the verified project.
 */
export const testsRouter = Router({ mergeParams: true });

const testId = (value: unknown) => parseIdParam(value, 'Test case');

testsRouter.get('/', async (req, res) => {
  const { items, meta } = await listTestCases(
    getProject(req).id,
    parseQuery(TestCaseListQuerySchema, req),
  );
  sendSuccess(res, items, meta);
});

testsRouter.post('/', async (req, res) => {
  const input = parseBody(TestCaseCreateSchema, req);
  sendCreated(res, await createTestCase(getProject(req).id, getAuth(req).userId, input));
});

testsRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getTestCase(getProject(req).id, testId(req.params.id)));
});

testsRouter.put('/:id', async (req, res) => {
  const input = parseBody(TestCaseUpdateSchema, req);
  sendSuccess(
    res,
    await updateTestCase(getProject(req).id, testId(req.params.id), getAuth(req).userId, input),
  );
});

testsRouter.delete('/:id', async (req, res) => {
  await deleteTestCase(getProject(req).id, testId(req.params.id));
  sendSuccess(res, { deleted: true });
});
