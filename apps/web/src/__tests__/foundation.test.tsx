import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { API_BASE_PATH, ApiClientError, apiClient, onUnauthorized } from '@/lib/api-client';
import { toneFor } from '@/lib/status-tone';
import { DataList } from '@/components/DataList';
import { DerivedValue } from '@/components/DerivedValue';
import { StatusBadge } from '@/components/StatusBadge';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { REFERENCE_VALUES, jsonResponse, renderWithProviders } from '@/test/render';

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized(undefined);
});

describe('api client', () => {
  it('sends the CSRF header and same-origin credentials on state-changing requests only', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, { success: true, data: {} })));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.post('/projects', { name: 'X' });
    await apiClient.get('/projects');

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const [postUrl, postInit] = calls[0];
    const [, getInit] = calls[1];
    expect(postUrl).toBe('/api/projects');
    expect(postInit.credentials).toBe('same-origin');
    expect(new Headers(postInit.headers).get('X-PMO-Request')).toBe('1');
    expect(new Headers(getInit.headers).get('X-PMO-Request')).toBeNull();
  });

  it('keeps uploads same-origin behind the /api proxy (Vite dev server or Vercel)', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(201, { success: true, data: {} })));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.upload('/projects/p1/attachments', new FormData());

    const [[url, init]] = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(API_BASE_PATH).toBe('/api');
    expect(url).toBe('/api/projects/p1/attachments');
    expect(init.credentials).toBe('same-origin');
    expect(new Headers(init.headers).get('X-PMO-Request')).toBe('1');
  });

  it('signals an expired session on 401 and surfaces the API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(401, {
            success: false,
            error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue' },
          }),
        ),
      ),
    );
    const handler = vi.fn();
    onUnauthorized(handler);

    await expect(apiClient.get('/projects')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('reports non-JSON and network failures safely', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>502</html>', { status: 502 }))),
    );
    await expect(apiClient.get('/projects')).rejects.toBeInstanceOf(ApiClientError);

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    await expect(apiClient.get('/projects')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('status presentation (REQ-010)', () => {
  it('derives tone from semantics, never from labels, and keeps missing values neutral', () => {
    const byCode = (code: string) => REFERENCE_VALUES.find((v) => v.code === code);
    expect(toneFor(undefined)).toBe('neutral');
    expect(toneFor(byCode('NOT_ASSESSED'))).toBe('neutral');
    expect(toneFor(byCode('GREEN'))).toBe('success');
    expect(toneFor(byCode('COMPLETED'))).toBe('success');
    expect(toneFor(byCode('BLOCKED'))).toBe('danger');
  });

  it('renders "Not set" for missing values and explicit unavailable text for derived data', () => {
    renderWithProviders(
      <>
        <StatusBadge valueId={null} />
        <StatusBadge valueId={4} />
        <DerivedValue value={null} unavailable="No plan data" />
      </>,
    );
    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByText('Green')).toHaveClass('pmo-badge-success');
    expect(screen.getByText('No plan data')).toBeInTheDocument();
  });
});

describe('responsive listing', () => {
  it('renders the same rows as a table (md+) and as cards (phones)', () => {
    renderWithProviders(
      <DataList
        rows={[{ id: 'a', name: 'Alpha', status: 'Open' }]}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name', render: (r) => r.name },
          { key: 'status', header: 'Status', render: (r) => r.status },
        ]}
      />,
    );
    expect(screen.getByTestId('datalist-table')).toHaveClass('d-none', 'd-md-block');
    expect(screen.getByTestId('datalist-cards')).toHaveClass('d-md-none');
    expect(screen.getAllByText('Alpha')).toHaveLength(2);
  });
});

describe('authentication flow', () => {
  it('redirects signed-out users to login with a return path', async () => {
    const { router } = renderWithProviders(<div />, {
      auth: { user: null },
      initialPath: '/projects?q=basc',
      routes: [
        { path: '/login', element: <p>Login screen</p> },
        {
          path: '/projects',
          element: (
            <RequireAuth>
              <p>Secret</p>
            </RequireAuth>
          ),
        },
      ],
    });
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/projects?q=basc')}`);
  });

  it('validates input and shows a generic message for rejected credentials', async () => {
    const user = userEvent.setup();
    const login = vi.fn(() =>
      Promise.reject(new ApiClientError('Invalid email or password', 401, 'INVALID_CREDENTIALS')),
    );
    renderWithProviders(<div />, {
      auth: { user: null, login },
      initialPath: '/login',
      routes: [{ path: '/login', element: <LoginPage /> }],
    });

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(login).not.toHaveBeenCalled();
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);

    await user.type(screen.getByLabelText('Email'), 'pm@example.test');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('pm@example.test', 'wrong-password');
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('navigates to the requested page after a successful sign-in', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<div />, {
      auth: { user: null },
      initialPath: '/login?next=%2Fprojects',
      routes: [
        { path: '/login', element: <LoginPage /> },
        { path: '/projects', element: <p>Projects page</p> },
      ],
    });
    await user.type(await screen.findByLabelText('Email'), 'pm@example.test');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Projects page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects');
  });

  it('never redirects to an external site after sign-in', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<div />, {
      auth: { user: null },
      initialPath: '/login?next=%2F%2Fevil.example',
      routes: [
        { path: '/login', element: <LoginPage /> },
        { path: '/', element: <p>Home</p> },
      ],
    });
    await user.type(await screen.findByLabelText('Email'), 'pm@example.test');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
