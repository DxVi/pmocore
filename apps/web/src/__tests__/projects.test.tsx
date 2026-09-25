import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project } from '@pmocore/shared';
import { ProjectCreatePage } from '@/features/projects/ProjectFormPage';
import { ProjectsListPage } from '@/features/projects/ProjectsListPage';
import { jsonResponse, renderWithProviders } from '@/test/render';

const PROJECT: Project = {
  id: '22222222-2222-4222-8222-222222222222',
  code: 'BASC-CQMS',
  name: 'Campus Queueing',
  summary: null,
  phaseId: 6,
  statusId: 1,
  healthId: null,
  startDate: null,
  targetDate: '2026-10-13',
  goLiveDate: null,
  nextMilestoneLabel: null,
  nextMilestoneDate: null,
  pmRemarks: null,
  ownerUserId: '11111111-1111-4111-8111-111111111111',
  archivedAt: null,
  createdAt: '2026-09-28T01:00:00.000Z',
  createdBy: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-09-28T01:00:00.000Z',
  updatedBy: '11111111-1111-4111-8111-111111111111',
  version: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe('projects', () => {
  it('lists projects with status badges and an explicit "Not assessed" health', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(200, {
            success: true,
            data: [PROJECT],
            meta: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
          }),
        ),
      ),
    );
    renderWithProviders(<div />, {
      initialPath: '/projects',
      routes: [{ path: '/projects', element: <ProjectsListPage /> }],
    });

    expect((await screen.findAllByText('BASC-CQMS')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not assessed').length).toBeGreaterThan(0);
    expect(screen.getByText('1 record(s)')).toBeInTheDocument();
  });

  it('shows an empty state with a create action when there are no projects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(200, {
            success: true,
            data: [],
            meta: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
          }),
        ),
      ),
    );
    renderWithProviders(<div />, {
      initialPath: '/projects',
      routes: [{ path: '/projects', element: <ProjectsListPage /> }],
    });
    expect(await screen.findByText(/No projects yet/)).toBeInTheDocument();
  });

  it('validates the create form, maps server field errors, and opens the new project', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(409, {
          success: false,
          error: {
            code: 'DUPLICATE',
            message: 'A project with this code already exists',
            details: [{ path: 'code', message: 'A project with this code already exists' }],
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(201, { success: true, data: PROJECT }));
    vi.stubGlobal('fetch', fetchMock);

    const { router } = renderWithProviders(<div />, {
      initialPath: '/projects/new',
      routes: [
        { path: '/projects/new', element: <ProjectCreatePage /> },
        { path: '/projects/:projectId', element: <p>Project page</p> },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Create project' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getAllByText('Required').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText(/Project code/), 'basc-cqms');
    await user.type(screen.getByLabelText(/Project name/), 'Campus Queueing');
    await user.selectOptions(screen.getByLabelText('Current phase'), '6');
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('A project with this code already exists')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      code: 'BASC-CQMS',
      name: 'Campus Queueing',
      phaseId: 6,
      statusId: null,
      targetDate: null,
    });

    await user.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('Project page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/projects/${PROJECT.id}`);
  });
});
