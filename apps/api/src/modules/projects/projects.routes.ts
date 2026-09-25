import { Router } from 'express';
import { ProjectCreateSchema, ProjectListQuerySchema, ProjectUpdateSchema } from '@pmocore/shared';
import { sendCreated, sendSuccess } from '../../lib/api-response.js';
import { parseBody, parseQuery } from '../../lib/validate.js';
import { getProject, loadProject } from '../../middleware/load-project.js';
import { getAuth } from '../../middleware/require-auth.js';
import {
  createProject,
  getProjectOverview,
  listProjects,
  setArchived,
  toProjectDto,
  updateProject,
} from './projects.service.js';

export const projectsRouter = Router();

projectsRouter.get('/', async (req, res) => {
  const query = parseQuery(ProjectListQuerySchema, req);
  const { items, meta } = await listProjects(getAuth(req).userId, query);
  sendSuccess(res, items, meta);
});

projectsRouter.post('/', async (req, res) => {
  const input = parseBody(ProjectCreateSchema, req);
  sendCreated(res, await createProject(getAuth(req).userId, input));
});

projectsRouter.get('/:projectId', loadProject, (req, res) => {
  sendSuccess(res, toProjectDto(getProject(req)));
});

projectsRouter.put('/:projectId', loadProject, async (req, res) => {
  const input = parseBody(ProjectUpdateSchema, req);
  sendSuccess(res, await updateProject(getAuth(req).userId, getProject(req), input));
});

projectsRouter.post('/:projectId/archive', loadProject, async (req, res) => {
  sendSuccess(res, await setArchived(getAuth(req).userId, getProject(req), true));
});

projectsRouter.post('/:projectId/unarchive', loadProject, async (req, res) => {
  sendSuccess(res, await setArchived(getAuth(req).userId, getProject(req), false));
});

projectsRouter.get('/:projectId/overview', loadProject, async (req, res) => {
  sendSuccess(res, await getProjectOverview(getProject(req)));
});
