import type { RouteObject } from 'react-router-dom';

/**
 * Actions & RAID routes (PKG-2). Paths are relative to /projects/:projectId.
 * Pages are loaded on demand to keep the phone start-up payload small.
 */
export const raidRoutes: RouteObject[] = [
  {
    path: 'raid',
    lazy: async () => ({ Component: (await import('./RaidListPage')).RaidListPage }),
  },
  {
    path: 'raid/new',
    lazy: async () => ({ Component: (await import('./RaidFormPage')).RaidCreatePage }),
  },
  {
    path: 'raid/:recordId',
    lazy: async () => ({ Component: (await import('./RaidDetailPage')).RaidDetailPage }),
  },
  {
    path: 'raid/:recordId/edit',
    lazy: async () => ({ Component: (await import('./RaidFormPage')).RaidEditPage }),
  },
];
