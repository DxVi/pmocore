import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Outlet } from 'react-router-dom';
import type { ActivityDetail, Project, RaidItem, ReferenceValue } from '@pmocore/shared';
import { REFERENCE_QUERY_KEY } from '@/hooks/useReferenceData';
import { REFERENCE_VALUES, jsonResponse, renderWithProviders } from '@/test/render';
import { ActivityCreatePage } from '../ActivityFormPage';
import { ActivityDetailPage } from '../ActivityDetailPage';
import { RaidListPage } from '../../raid/RaidListPage';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT: Project = {
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

const extraRefs: ReferenceValue[] = [
  {
    id: 20,
    category: 'ACTIVITY_TYPE',
    code: 'SITE_VISIT',
    label: 'Site Visit',
    sortOrder: 20,
    semantic: null,
    isActive: true,
  },
  {
    id: 30,
    category: 'RAID_TYPE',
    code: 'ACTION',
    label: 'Action',
    sortOrder: 10,
    semantic: null,
    isActive: true,
  },
  {
    id: 31,
    category: 'RAID_TYPE',
    code: 'RISK',
    label: 'Risk',
    sortOrder: 20,
    semantic: null,
    isActive: true,
  },
  {
    id: 40,
    category: 'STATUS',
    code: 'NOT_STARTED',
    label: 'Not Started',
    sortOrder: 10,
    semantic: 'OPEN',
    isActive: true,
  },
];

const ACTIVITY: ActivityDetail = {
  id: '33333333-3333-4333-8333-333333333333',
  projectId: PROJECT.id,
  code: 'MV-001',
  activityTypeId: 20,
  title: 'Registrar site visit',
  activityDate: '2026-10-05',
  startTime: '09:30:00',
  endTime: null,
  modeId: null,
  location: 'Registrar',
  endUsers: null,
  attendees: 'Registrar',
  agenda: null,
  findings: 'Queue display font too small',
  outcomes: null,
  todoSummary: null,
  minutesRef: null,
  minutesDocumentId: null,
  preparedByUserId: USER_ID,
  statusId: 40,
  nextScheduleDate: null,
  nextScheduleNote: null,
  relatedRequirementId: null,
  previousActivityId: null,
  createdAt: '2026-10-05T01:00:00.000Z',
  createdBy: USER_ID,
  updatedAt: '2026-10-05T01:00:00.000Z',
  updatedBy: USER_ID,
  version: 1,
  followUps: [],
  relatedRequirement: null,
  attachmentCount: 0,
};

function ProjectOutlet() {
  return <Outlet context={{ project: PROJECT }} />;
}

function renderProjectRoute(path: string, element: React.ReactElement, initialPath: string) {
  const result = renderWithProviders(<div />, {
    initialPath,
    routes: [
      {
        path: '/projects/:projectId',
        element: <ProjectOutlet />,
        children: [
          { path, element },
          { path: 'meetings/:recordId', element: <p>Meeting detail page</p> },
        ],
      },
    ],
  });
  result.queryClient.setQueryData(REFERENCE_QUERY_KEY, {
    values: [...REFERENCE_VALUES, ...extraRefs],
  });
  return result;
}

afterEach(() => vi.unstubAllGlobals());

describe('Meetings & Visits screens', () => {
  it('creates a meeting and lands on its detail with attachments in view', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((_url: string, init: RequestInit) =>
      Promise.resolve(
        init.method === 'POST'
          ? jsonResponse(201, { success: true, data: ACTIVITY })
          : jsonResponse(200, { success: true, data: [] }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { router } = renderProjectRoute(
      'meetings/new',
      <ActivityCreatePage />,
      `/projects/${PROJECT.id}/meetings/new`,
    );

    // Wait until the test's extra reference values are applied (the form re-initializes once).
    await screen.findByRole('option', { name: 'Site Visit' });
    await user.type(await screen.findByLabelText(/^Title/), 'Registrar site visit');
    await user.selectOptions(screen.getByLabelText('Type'), '20');
    await user.click(screen.getByRole('button', { name: 'Save and add attachments' }));

    expect(await screen.findByText('Meeting detail page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/projects/${PROJECT.id}/meetings/${ACTIVITY.id}`);
    expect(router.state.location.hash).toBe('#attachments');

    const post = fetchMock.mock.calls.find(([, init]) => init.method === 'POST');
    expect(JSON.parse(post?.[1].body as string)).toMatchObject({
      title: 'Registrar site visit',
      activityTypeId: 20,
      statusId: 40,
      startTime: null,
    });
  });

  it('quick-adds a follow-up action from the meeting detail', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (init.method === 'POST' && url.endsWith('/actions')) {
        return Promise.resolve(jsonResponse(201, { success: true, data: [] }));
      }
      if (url.includes('/attachments'))
        return Promise.resolve(jsonResponse(200, { success: true, data: [] }));
      return Promise.resolve(jsonResponse(200, { success: true, data: ACTIVITY }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderProjectRoute(
      'meetings/:recordId/view',
      <ActivityDetailPage />,
      `/projects/${PROJECT.id}/meetings/${ACTIVITY.id}/view`,
    );

    const form = await screen.findByRole('form', { name: 'Quick add follow-up' });
    await user.type(within(form).getByLabelText('Follow-up'), 'Send revised mock-up');
    await user.type(within(form).getByLabelText('Owner'), 'Dixon');
    await user.type(within(form).getByLabelText('Due date'), '2026-10-09');
    await user.click(within(form).getByRole('button', { name: 'Add follow-up' }));

    const post = fetchMock.mock.calls.find(([url]) => url.endsWith('/actions'));
    expect(post?.[0]).toBe(`/api/projects/${PROJECT.id}/activities/${ACTIVITY.id}/actions`);
    expect(JSON.parse(post?.[1].body as string)).toEqual({
      actions: [
        {
          title: 'Send revised mock-up',
          ownerName: 'Dixon',
          dueDate: '2026-10-09',
          raidTypeId: 30,
          priorityId: null,
        },
      ],
    });
    expect(await within(form).findByLabelText('Follow-up')).toHaveValue('');
  });
});

describe('Actions & RAID list', () => {
  it('shows open items by default with derived overdue state', async () => {
    const item: RaidItem = {
      id: '44444444-4444-4444-8444-444444444444',
      projectId: PROJECT.id,
      code: 'ACT-001',
      typeId: 30,
      title: 'Send revised mock-up',
      description: null,
      impact: null,
      ownerName: 'Dixon',
      dateRaised: '2026-10-01',
      sourceActivityId: ACTIVITY.id,
      probabilityId: null,
      priorityId: null,
      dueDate: '2026-10-02',
      statusId: 40,
      mitigation: null,
      resolution: null,
      closedDate: null,
      evidence: null,
      remarks: null,
      requirementId: null,
      releaseId: null,
      createdAt: '2026-10-01T01:00:00.000Z',
      createdBy: USER_ID,
      updatedAt: '2026-10-01T01:00:00.000Z',
      updatedBy: USER_ID,
      version: 1,
      overdue: true,
      daysOpen: 4,
    };
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          success: true,
          data: [item],
          meta: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderProjectRoute('raid', <RaidListPage />, `/projects/${PROJECT.id}/raid`);

    expect((await screen.findAllByText('Send revised mock-up')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('open=true');
    expect(url).toContain('sort=dueDate');
  });
});
