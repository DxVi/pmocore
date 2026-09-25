import type { RouteObject } from 'react-router-dom';
import { ModulePlaceholder } from '@/components/layout/ModulePlaceholder';

/**
 * Releases & Acceptance routes — registered by PKG-1, implemented by PKG-3 inside this directory
 * (tasks.md §3.3). Paths are relative to /projects/:projectId. Pages read the
 * current project with useCurrentProject().
 */
export const releasesRoutes: RouteObject[] = [
  {
    path: 'releases/*',
    element: <ModulePlaceholder title="Releases & Acceptance" requirementRange="REQ-054–058" />,
  },
];
