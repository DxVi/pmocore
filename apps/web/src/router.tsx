import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { documentsRoutes } from '@/features/documents/routes';
import { meetingsRoutes } from '@/features/meetings/routes';
import { planRoutes } from '@/features/plan/routes';
import { ProjectCreatePage, ProjectEditPage } from '@/features/projects/ProjectFormPage';
import { ProjectLayout } from '@/features/projects/ProjectLayout';
import { ProjectOverviewPage } from '@/features/projects/ProjectOverviewPage';
import { ProjectsListPage } from '@/features/projects/ProjectsListPage';
import { raidRoutes } from '@/features/raid/routes';
import { releasesRoutes } from '@/features/releases/routes';
import { requirementsRoutes } from '@/features/requirements/routes';
import { testingRoutes } from '@/features/testing/routes';

/**
 * Application routes — frozen by PKG-1 for parallel work (tasks.md §3.3).
 * Module packages add pages through their own features/<module>/routes.tsx.
 */
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsListPage /> },
      { path: 'projects/new', element: <ProjectCreatePage /> },
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <ProjectOverviewPage /> },
          { path: 'edit', element: <ProjectEditPage /> },
          ...planRoutes,
          ...requirementsRoutes,
          ...meetingsRoutes,
          ...raidRoutes,
          ...testingRoutes,
          ...releasesRoutes,
          ...documentsRoutes,
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
