import { Router } from 'express';
import type { ReferenceDataResponse } from '@pmocore/shared';
import { sendSuccess } from '../../lib/api-response.js';
import { getReferenceValues } from './reference.service.js';

export const referenceRouter = Router();

referenceRouter.get('/', async (_req, res) => {
  const data: ReferenceDataResponse = { values: await getReferenceValues() };
  sendSuccess(res, data);
});
