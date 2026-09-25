import { Router } from 'express';
import {
  DocumentCreateSchema,
  DocumentListQuerySchema,
  DocumentUpdateSchema,
} from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseIdParam, parseQuery } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from './documents.service.js';

/**
 * Documents API (REQ-059–061). Mounted behind requireAuth, loadProject and
 * blockArchivedWrites; every query is scoped to the verified project. Document
 * files use the shared attachments API with parentType="document".
 */
export const documentsRouter = Router({ mergeParams: true });

const documentId = (value: unknown) => parseIdParam(value, 'Document');

documentsRouter.get('/', async (req, res) => {
  const { items, meta } = await listDocuments(
    getProject(req).id,
    parseQuery(DocumentListQuerySchema, req),
  );
  sendSuccess(res, items, meta);
});

documentsRouter.post('/', async (req, res) => {
  const input = parseBody(DocumentCreateSchema, req);
  sendCreated(res, await createDocument(getProject(req).id, getAuth(req).userId, input));
});

documentsRouter.get('/:id', async (req, res) => {
  sendSuccess(res, await getDocument(getProject(req).id, documentId(req.params.id)));
});

documentsRouter.put('/:id', async (req, res) => {
  const input = parseBody(DocumentUpdateSchema, req);
  sendSuccess(
    res,
    await updateDocument(getProject(req).id, documentId(req.params.id), getAuth(req).userId, input),
  );
});

documentsRouter.delete('/:id', async (req, res) => {
  await deleteDocument(getProject(req).id, documentId(req.params.id), getAuth(req).userId);
  sendSuccess(res, { deleted: true });
});
