import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router-dom';
import type { AuthUser, ReferenceValue } from '@pmocore/shared';
import { AuthContext, type AuthContextValue } from '@/providers/auth-context';
import { REFERENCE_QUERY_KEY } from '@/hooks/useReferenceData';

export const TEST_USER: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'pm@example.test',
  displayName: 'Test PM',
};

export const REFERENCE_VALUES: ReferenceValue[] = [
  {
    id: 1,
    category: 'STATUS',
    code: 'IN_PROGRESS',
    label: 'In Progress',
    sortOrder: 20,
    semantic: 'OPEN',
    isActive: true,
  },
  {
    id: 2,
    category: 'STATUS',
    code: 'BLOCKED',
    label: 'Blocked',
    sortOrder: 40,
    semantic: 'OPEN',
    isActive: true,
  },
  {
    id: 3,
    category: 'STATUS',
    code: 'COMPLETED',
    label: 'Completed',
    sortOrder: 50,
    semantic: 'DONE',
    isActive: true,
  },
  {
    id: 4,
    category: 'HEALTH',
    code: 'GREEN',
    label: 'Green',
    sortOrder: 10,
    semantic: 'GREEN',
    isActive: true,
  },
  {
    id: 5,
    category: 'HEALTH',
    code: 'NOT_ASSESSED',
    label: 'Not Assessed',
    sortOrder: 40,
    semantic: 'UNKNOWN',
    isActive: true,
  },
  {
    id: 6,
    category: 'PROJECT_PHASE',
    code: 'DESIGN',
    label: 'Design',
    sortOrder: 40,
    semantic: null,
    isActive: true,
  },
];

type Options = {
  auth?: Partial<AuthContextValue>;
  routes?: RouteObject[];
  initialPath?: string;
};

export function renderWithProviders(element: ReactElement, options: Options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(REFERENCE_QUERY_KEY, { values: REFERENCE_VALUES });

  const auth: AuthContextValue = {
    user: TEST_USER,
    login: () => Promise.resolve(TEST_USER),
    logout: () => Promise.resolve(),
    ...options.auth,
  };

  const router = createMemoryRouter(options.routes ?? [{ path: '*', element }], {
    initialEntries: [options.initialPath ?? '/'],
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}

/** Minimal fetch Response for API envelope mocks. */
export function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
