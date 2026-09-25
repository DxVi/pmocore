import type { RouteObject } from 'react-router-dom';

/**
 * Meetings & Visits routes (PKG-2). Paths are relative to /projects/:projectId.
 * Pages are loaded on demand to keep the phone start-up payload small.
 */
export const meetingsRoutes: RouteObject[] = [
  {
    path: 'meetings',
    lazy: async () => ({ Component: (await import('./ActivitiesListPage')).ActivitiesListPage }),
  },
  {
    path: 'meetings/new',
    lazy: async () => ({ Component: (await import('./ActivityFormPage')).ActivityCreatePage }),
  },
  {
    path: 'meetings/:recordId',
    lazy: async () => ({ Component: (await import('./ActivityDetailPage')).ActivityDetailPage }),
  },
  {
    path: 'meetings/:recordId/edit',
    lazy: async () => ({ Component: (await import('./ActivityFormPage')).ActivityEditPage }),
  },
];
