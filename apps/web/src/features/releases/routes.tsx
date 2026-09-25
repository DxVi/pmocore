import type { RouteObject } from 'react-router-dom';

/**
 * Releases & Acceptance routes (PKG-3). Paths are relative to /projects/:projectId.
 * Pages are loaded on demand to keep the phone start-up payload small.
 */
export const releasesRoutes: RouteObject[] = [
  {
    path: 'releases',
    lazy: async () => ({ Component: (await import('./ReleasesListPage')).ReleasesListPage }),
  },
  {
    path: 'releases/new',
    lazy: async () => ({ Component: (await import('./ReleaseFormPage')).ReleaseCreatePage }),
  },
  {
    path: 'releases/:recordId',
    lazy: async () => ({ Component: (await import('./ReleaseDetailPage')).ReleaseDetailPage }),
  },
  {
    path: 'releases/:recordId/edit',
    lazy: async () => ({ Component: (await import('./ReleaseFormPage')).ReleaseEditPage }),
  },
];
