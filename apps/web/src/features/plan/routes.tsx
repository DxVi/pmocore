import type { RouteObject } from 'react-router-dom';

/**
 * Project Plan routes (PKG-3). Paths are relative to /projects/:projectId.
 * Pages are loaded on demand to keep the phone start-up payload small.
 */
export const planRoutes: RouteObject[] = [
  {
    path: 'plan',
    lazy: async () => ({ Component: (await import('./WorkItemsListPage')).WorkItemsListPage }),
  },
  {
    path: 'plan/new',
    lazy: async () => ({ Component: (await import('./WorkItemFormPage')).WorkItemCreatePage }),
  },
  {
    path: 'plan/:recordId',
    lazy: async () => ({ Component: (await import('./WorkItemDetailPage')).WorkItemDetailPage }),
  },
  {
    path: 'plan/:recordId/edit',
    lazy: async () => ({ Component: (await import('./WorkItemFormPage')).WorkItemEditPage }),
  },
];
