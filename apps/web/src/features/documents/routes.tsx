import type { RouteObject } from 'react-router-dom';

/**
 * Documents routes (PKG-3). Paths are relative to /projects/:projectId.
 * Pages are loaded on demand to keep the phone start-up payload small.
 */
export const documentsRoutes: RouteObject[] = [
  {
    path: 'documents',
    lazy: async () => ({ Component: (await import('./DocumentsListPage')).DocumentsListPage }),
  },
  {
    path: 'documents/new',
    lazy: async () => ({ Component: (await import('./DocumentFormPage')).DocumentCreatePage }),
  },
  {
    path: 'documents/:recordId',
    lazy: async () => ({ Component: (await import('./DocumentDetailPage')).DocumentDetailPage }),
  },
  {
    path: 'documents/:recordId/edit',
    lazy: async () => ({ Component: (await import('./DocumentFormPage')).DocumentEditPage }),
  },
];
