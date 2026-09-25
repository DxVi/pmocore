import type { RouteObject } from 'react-router-dom';
import { ModulePlaceholder } from '@/components/layout/ModulePlaceholder';

/**
 * Project Plan routes — registered by PKG-1, implemented by PKG-3 inside this directory
 * (tasks.md §3.3). Paths are relative to /projects/:projectId. Pages read the
 * current project with useCurrentProject().
 */
export const planRoutes: RouteObject[] = [
  {
    path: 'plan/*',
    element: <ModulePlaceholder title="Project Plan" requirementRange="REQ-019–023" />,
  },
];
