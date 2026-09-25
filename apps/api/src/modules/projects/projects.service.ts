import type {
  Project,
  ProjectCreate,
  ProjectListQuery,
  ProjectOverview,
  ProjectUpdate,
} from '@pmocore/shared';
import { AppError } from '../../lib/app-error.js';
import { paginationMeta, toIso } from '../../lib/pagination.js';
import { assertProjectWritable } from '../access/project-access.service.js';
import { assertReferenceFields } from '../reference-data/reference.service.js';
import {
  insertProject,
  listProjects as listProjectRows,
  recentProjectActivity,
  setProjectArchived,
  updateProjectVersioned,
  type ProjectRow,
} from './projects.repository.js';

export function toProjectDto(row: ProjectRow): Project {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    summary: row.summary,
    phaseId: row.phaseId,
    statusId: row.statusId,
    healthId: row.healthId,
    startDate: row.startDate,
    targetDate: row.targetDate,
    goLiveDate: row.goLiveDate,
    nextMilestoneLabel: row.nextMilestoneLabel,
    nextMilestoneDate: row.nextMilestoneDate,
    pmRemarks: row.pmRemarks,
    ownerUserId: row.ownerUserId,
    archivedAt: toIso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

const referenceFields = (input: {
  phaseId: number | null;
  statusId: number | null;
  healthId: number | null;
}) => ({
  phaseId: input.phaseId,
  statusId: input.statusId,
  healthId: input.healthId,
});

export async function listProjects(actorId: string, query: ProjectListQuery) {
  const { rows, totalItems } = await listProjectRows(actorId, query);
  return {
    items: rows.map(toProjectDto),
    meta: paginationMeta(query.page, query.pageSize, totalItems),
  };
}

/** New projects are owned by their creator (ownership-ready, REQ-015). */
export async function createProject(actorId: string, input: ProjectCreate): Promise<Project> {
  await assertReferenceFields(referenceFields(input));
  const row = await insertProject({
    ...input,
    ownerUserId: actorId,
    createdBy: actorId,
    updatedBy: actorId,
  });
  return toProjectDto(row);
}

export async function updateProject(
  actorId: string,
  project: ProjectRow,
  input: ProjectUpdate,
): Promise<Project> {
  assertProjectWritable(project);
  await assertReferenceFields(referenceFields(input), referenceFields(project));
  const { version, ...fields } = input;
  const row = await updateProjectVersioned(project.id, version, { ...fields, updatedBy: actorId });
  if (!row) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'This project was changed elsewhere. Reload to see the latest version.',
    );
  }
  return toProjectDto(row);
}

/** Archive and unarchive are idempotent; archived projects keep all their records (REQ-016). */
export async function setArchived(actorId: string, project: ProjectRow, archived: boolean) {
  if (Boolean(project.archivedAt) === archived) return toProjectDto(project);
  return toProjectDto(await setProjectArchived(project.id, actorId, archived));
}

export async function getProjectOverview(project: ProjectRow): Promise<ProjectOverview> {
  const recentActivity = await recentProjectActivity(project.id);
  return {
    project: toProjectDto(project),
    lastActivityAt: recentActivity[0]?.updatedAt ?? project.updatedAt.toISOString(),
    recentActivity,
  };
}
