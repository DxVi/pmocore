import { useOutletContext } from 'react-router-dom';
import type { Project } from '@pmocore/shared';

export type ProjectOutletContext = { project: Project };

/**
 * The current project for pages rendered inside ProjectLayout (all module pages).
 * `project.archivedAt` set means read-only: hide create/edit/remove controls.
 */
export function useCurrentProject(): Project {
  return useOutletContext<ProjectOutletContext>().project;
}
