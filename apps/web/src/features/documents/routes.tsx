import type { RouteObject } from 'react-router-dom';
import { ModulePlaceholder } from '@/components/layout/ModulePlaceholder';

/**
 * Documents routes — registered by PKG-1, implemented by PKG-3 inside this directory
 * (tasks.md §3.3). Paths are relative to /projects/:projectId. Pages read the
 * current project with useCurrentProject().
 */
export const documentsRoutes: RouteObject[] = [
  {
    path: 'documents/*',
    element: <ModulePlaceholder title="Documents" requirementRange="REQ-059–061" />,
  },
];
