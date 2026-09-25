import { and, eq } from 'drizzle-orm';
import { db, projects } from '@pmocore/database';
import { AppError } from '../../lib/app-error.js';

export type ProjectRecord = typeof projects.$inferSelect;
export type AccessMode = 'read' | 'write';

const projectNotFound = () => new AppError(404, 'NOT_FOUND', 'Project not found');

/**
 * The single server-side authorization decision point for project data
 * (design §4.6, REQ-075/076). Solo MVP rule: the project exists and the actor
 * owns it. Inaccessible and unknown projects both return 404, so project
 * existence is never disclosed. Multi-user support later changes only this
 * function (membership and role checks), not its callers.
 */
export async function assertProjectAccess(
  actorId: string,
  projectId: string,
): Promise<ProjectRecord> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerUserId, actorId)))
    .limit(1);
  if (!project) throw projectNotFound();
  return project;
}

/** Archived projects are read-only (REQ-016, design §5.6). */
export function assertProjectWritable(project: ProjectRecord): void {
  if (project.archivedAt) {
    throw new AppError(409, 'PROJECT_ARCHIVED', 'This project is archived and read-only');
  }
}
