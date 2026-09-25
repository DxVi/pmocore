import type { RouteObject } from 'react-router-dom';

/**
 * Testing & Defects routes (PKG-3). Paths are relative to /projects/:projectId.
 * Pages are loaded on demand to keep the phone start-up payload small.
 */
const forms = () => import('./TestingFormPages');
const details = () => import('./TestingDetailPages');

export const testingRoutes: RouteObject[] = [
  {
    path: 'testing',
    lazy: async () => ({ Component: (await import('./TestingListPage')).TestingListPage }),
  },
  {
    path: 'testing/tests/new',
    lazy: async () => ({ Component: (await forms()).TestCaseCreatePage }),
  },
  {
    path: 'testing/tests/:recordId',
    lazy: async () => ({ Component: (await details()).TestCaseDetailPage }),
  },
  {
    path: 'testing/tests/:recordId/edit',
    lazy: async () => ({ Component: (await forms()).TestCaseEditPage }),
  },
  {
    path: 'testing/defects/new',
    lazy: async () => ({ Component: (await forms()).DefectCreatePage }),
  },
  {
    path: 'testing/defects/:recordId',
    lazy: async () => ({ Component: (await details()).DefectDetailPage }),
  },
  {
    path: 'testing/defects/:recordId/edit',
    lazy: async () => ({ Component: (await forms()).DefectEditPage }),
  },
];
