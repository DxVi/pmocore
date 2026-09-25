import { pipeline } from 'node:stream/promises';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  ATTACHMENT_FILE_TYPES,
  ATTACHMENT_MESSAGES,
  AttachmentListQuerySchema,
  AttachmentUploadFieldsSchema,
} from '@pmocore/shared';
import { AppError } from '../../lib/app-error.js';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseIdParam, parseQuery, parseWith } from '../../lib/validate.js';
import { getProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  MAX_UPLOAD_BYTES,
  listAttachments,
  openAttachment,
  removeAttachment,
  uploadAttachment,
} from './attachments.service.js';
import { getAttachmentStorage } from './storage/index.js';

// Validate the storage configuration when the application starts (fail fast).
getAttachmentStorage();

/**
 * Attachments API (REQ-035–042, 061). Mounted behind requireAuth, loadProject and
 * blockArchivedWrites, so every request is authenticated and project-authorized.
 */
export const attachmentsRouter = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  // Browsers send UTF-8 file names; the default (latin1) would garble e.g. "Café".
  defParamCharset: 'utf8',
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5, fieldSize: 1024, parts: 6 },
});

/** Accepts exactly one multipart `file` part; limit errors become clear API errors. */
function receiveSingleFile(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(
            413,
            'FILE_TOO_LARGE',
            ATTACHMENT_MESSAGES.tooLarge(`more than ${(MAX_UPLOAD_BYTES / 1_048_576).toFixed(0)}`),
          ),
        );
      }
      return next(new AppError(400, 'VALIDATION_ERROR', 'Upload one file at a time.'));
    }
    next(err);
  });
}

attachmentsRouter.get('/', async (req, res) => {
  const query = parseQuery(AttachmentListQuerySchema, req);
  sendSuccess(res, await listAttachments(getProject(req).id, query.parentType, query.parentId));
});

attachmentsRouter.post('/', receiveSingleFile, async (req, res) => {
  const fields = parseWith(AttachmentUploadFieldsSchema, req.body, 'Upload details are invalid');
  const auth = getAuth(req);
  const attachment = await uploadAttachment(
    getProject(req).id,
    { userId: auth.userId, displayName: auth.user.displayName },
    fields,
    req.file,
  );
  sendCreated(res, attachment);
});

/** RFC 6266 Content-Disposition with an ASCII fallback and a UTF-8 file name. */
function contentDisposition(type: 'inline' | 'attachment', name: string) {
  const fallback = name.replace(/[^\x20-\x7e]|["\\%;]/g, '_');
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

attachmentsRouter.get('/:id/content', async (req, res) => {
  const { row, stream } = await openAttachment(
    getProject(req).id,
    parseIdParam(req.params.id, 'Attachment'),
  );
  const fileType = ATTACHMENT_FILE_TYPES.find((t) => t.contentType === row.contentType);
  const inline = fileType?.disposition === 'inline' && req.query.download !== '1';

  res.setHeader('Content-Type', row.contentType);
  res.setHeader('Content-Length', String(row.sizeBytes));
  res.setHeader(
    'Content-Disposition',
    contentDisposition(inline ? 'inline' : 'attachment', row.originalName),
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (row.contentType.startsWith('image/')) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    );
  } else if (row.contentType === 'application/pdf') {
    // The page CSP (object-src 'none') would stop the browser's built-in PDF viewer.
    res.removeHeader('Content-Security-Policy');
  }
  await pipeline(stream, res);
});

attachmentsRouter.delete('/:id', async (req, res) => {
  await removeAttachment(
    getProject(req).id,
    parseIdParam(req.params.id, 'Attachment'),
    getAuth(req).userId,
  );
  sendSuccess(res, { deleted: true });
});
