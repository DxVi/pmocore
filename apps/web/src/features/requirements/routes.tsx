import type { RouteObject } from 'react-router-dom';

/**
 * Requirements routes (PKG-3). Paths are relative to /projects/:projectId.
 * Pages are loaded on demand to keep the phone start-up payload small.
 */
export const requirementsRoutes: RouteObject[] = [
  {
    path: 'requirements',
    lazy: async () => ({
      Component: (await import('./RequirementsListPage')).RequirementsListPage,
    }),
  },
  {
    path: 'requirements/new',
    lazy: async () => ({
      Component: (await import('./RequirementFormPage')).RequirementCreatePage,
    }),
  },
  {
    path: 'requirements/:recordId',
    lazy: async () => ({
      Component: (await import('./RequirementDetailPage')).RequirementDetailPage,
    }),
  },
  {
    path: 'requirements/:recordId/edit',
    lazy: async () => ({ Component: (await import('./RequirementFormPage')).RequirementEditPage }),
  },
];
