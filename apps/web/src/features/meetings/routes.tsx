import type { RouteObject } from 'react-router-dom';
import { ModulePlaceholder } from '@/components/layout/ModulePlaceholder';

/**
 * Meetings & Visits routes — registered by PKG-1, implemented by PKG-2 inside this directory
 * (tasks.md §3.3). Paths are relative to /projects/:projectId. Pages read the
 * current project with useCurrentProject().
 */
export const meetingsRoutes: RouteObject[] = [
  {
    path: 'meetings/*',
    element: <ModulePlaceholder title="Meetings & Visits" requirementRange="REQ-029–043" />,
  },
];
