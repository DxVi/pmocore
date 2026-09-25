/** Test-only helpers for Package 3 screens (imported only from *.test.tsx files). */
import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
import { vi } from 'vitest';
import type { Project, ReferenceValue } from '@pmocore/shared';
import { REFERENCE_QUERY_KEY } from '@/hooks/useReferenceData';
import { REFERENCE_VALUES, jsonResponse, renderWithProviders } from '@/test/render';

export const USER_ID = '11111111-1111-4111-8111-111111111111';

export const TEST_PROJECT: Project = {
  id: '22222222-2222-4222-8222-222222222222',
  code: 'BASC-CQMS',
  name: 'Campus Queueing',
  summary: null,
  phaseId: null,
  statusId: null,
  healthId: null,
  startDate: null,
  targetDate: null,
  goLiveDate: null,
  nextMilestoneLabel: null,
  nextMilestoneDate: null,
  pmRemarks: null,
  ownerUserId: USER_ID,
  archivedAt: null,
  createdAt: '2026-09-28T01:00:00.000Z',
  createdBy: USER_ID,
  updatedAt: '2026-09-28T01:00:00.000Z',
  updatedBy: USER_ID,
  version: 1,
};

export const EXTRA_REFERENCES: ReferenceValue[] = [
  {
    id: 50,
    category: 'PRIORITY',
    code: 'HIGH',
    label: 'High',
    sortOrder: 20,
    semantic: null,
    isActive: true,
  },
  {
    id: 60,
    category: 'TEST_RESULT',
    code: 'FAILED',
    label: 'Failed',
    sortOrder: 30,
    semantic: 'FAIL',
    isActive: true,
  },
  {
    id: 61,
    category: 'TEST_RESULT',
    code: 'FOR_RETEST',
    label: 'For Retest',
    sortOrder: 50,
    semantic: 'RETEST',
    isActive: true,
  },
  {
    id: 70,
    category: 'TEST_STAGE',
    code: 'UAT',
    label: 'UAT',
    sortOrder: 20,
    semantic: null,
    isActive: true,
  },
];

export const meta = { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 };

export function recordMeta(id: string, code: string) {
  return {
    id,
    projectId: TEST_PROJECT.id,
    code,
    createdAt: '2026-10-01T01:00:00.000Z',
    createdBy: USER_ID,
    updatedAt: '2026-10-01T01:00:00.000Z',
    updatedBy: USER_ID,
    version: 1,
  };
}

type Route = (url: string, init: RequestInit) => unknown;

/** Stubs fetch: the handler returns [status, data] or data (200). */
export function mockApi(handler: Route) {
  const fetchMock = vi.fn((url: string, init: RequestInit) => {
    const result = handler(url, init);
    let status = 200;
    let data: unknown = result;
    if (Array.isArray(result) && typeof result[0] === 'number') {
      status = result[0];
      data = result[1] as unknown;
    }
    return Promise.resolve(
      jsonResponse(status, {
        success: true,
        data,
        ...(Array.isArray(data) ? { meta } : {}),
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Renders a project-module page inside a ProjectLayout-like outlet context. */
export function renderInProject(
  path: string,
  element: ReactElement,
  url: string,
  extraRoutes: { path: string; element: ReactElement }[] = [],
) {
  const result = renderWithProviders(<div />, {
    initialPath: url,
    routes: [
      {
        path: '/projects/:projectId',
        element: <Outlet context={{ project: TEST_PROJECT }} />,
        children: [{ path, element }, ...extraRoutes],
      },
    ],
  });
  result.queryClient.setQueryData(REFERENCE_QUERY_KEY, {
    values: [...REFERENCE_VALUES, ...EXTRA_REFERENCES],
  });
  return result;
}
