import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';
import { parseIdParam } from '../lib/validate.js';
import {
  assertProjectAccess,
  assertProjectWritable,
  type ProjectRecord,
} from '../modules/access/project-access.service.js';
import { getAuth } from './require-auth.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Resolves `:projectId` through the access check and exposes it as `req.project`. */
export async function loadProject(req: Request, _res: Response, next: NextFunction) {
  const projectId = parseIdParam(req.params.projectId, 'Project');
  req.project = await assertProjectAccess(getAuth(req).userId, projectId);
  next();
}

/** Mounted in front of every project-scoped module router: archived projects reject writes. */
export function blockArchivedWrites(req: Request, _res: Response, next: NextFunction) {
  if (!SAFE_METHODS.has(req.method)) assertProjectWritable(getProject(req));
  next();
}

/** Typed accessor for handlers mounted behind loadProject. */
export function getProject(req: Request): ProjectRecord {
  if (!req.project) throw new AppError(404, 'NOT_FOUND', 'Project not found');
  return req.project;
}
