import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RequirementDetail, WorkItemDetail } from '@pmocore/shared';
import { WorkItemCreatePage } from '@/features/plan/WorkItemFormPage';
import {
  mockApi,
  recordMeta,
  renderInProject,
  TEST_PROJECT,
} from '@/features/plan/common/test-support';
import { RequirementDetailPage } from '../RequirementDetailPage';

const REQUIREMENT: RequirementDetail = {
  ...recordMeta('33333333-3333-4333-8333-333333333333', 'REQ-001'),
  module: 'Kiosk',
  dateRaised: '2026-09-05',
  source: 'Registrar',
  statement: 'Queue display shows the ticket number',
  acceptanceCriteria: 'Visible from 10 metres',
  requirementTypeId: null,
  priorityId: 50,
  assigneeName: null,
  statusId: 1,
  targetReleaseId: null,
  isChangeRequest: false,
  changeRequestRaidId: null,
  validationEvidence: null,
  remarks: null,
  workItems: [
    { id: '44444444-4444-4444-8444-444444444444', code: 'WI-001', title: 'Display module' },
  ],
  tests: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      code: 'TC-001',
      title: 'Show ticket',
      resultId: 60,
    },
  ],
  defects: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      code: 'DEF-001',
      title: 'Font too small',
      testCaseId: '55555555-5555-4555-8555-555555555555',
      statusId: 1,
      retestResultId: 61,
    },
  ],
  targetRelease: null,
  releasedIn: [
    {
      id: '77777777-7777-4777-8777-777777777777',
      code: 'REL-001',
      title: 'v1.0',
      note: 'initial',
      acceptanceStatusId: null,
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('Project Plan', () => {
  it('creates a work item with typed values and opens it', async () => {
    const user = userEvent.setup();
    const created: WorkItemDetail = {
      ...recordMeta('44444444-4444-4444-8444-444444444444', 'WI-001'),
      phaseId: null,
      workstream: null,
      title: 'Display module',
      description: null,
      ownerName: null,
      plannedStart: null,
      plannedEnd: null,
      actualStart: null,
      actualEnd: null,
      percentComplete: 40,
      statusId: null,
      priorityId: null,
      isMilestone: true,
      dependencyNote: null,
      evidenceRef: null,
      evidenceDocumentId: null,
      remarks: null,
      requirements: [],
    };
    const fetchMock = mockApi((_url, init) => (init.method === 'POST' ? [201, created] : []));
    const { router } = renderInProject(
      'plan/new',
      <WorkItemCreatePage />,
      `/projects/${TEST_PROJECT.id}/plan/new`,
      [{ path: 'plan/:recordId', element: <p>Work item page</p> }],
    );

    await user.type(await screen.findByLabelText(/Deliverable \/ task/), 'Display module');
    await user.clear(screen.getByLabelText('Percent complete'));
    await user.type(screen.getByLabelText('Percent complete'), '40');
    await user.click(screen.getByLabelText('Milestone'));
    await user.type(screen.getByLabelText('Planned start'), '2026-10-10');
    await user.type(screen.getByLabelText('Planned end'), '2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Create work item' }));
    expect(
      await screen.findByText('Planned end must be on or after planned start'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    await user.clear(screen.getByLabelText('Planned end'));
    await user.type(screen.getByLabelText('Planned end'), '2026-10-20');
    await user.click(screen.getByRole('button', { name: 'Create work item' }));
    expect(await screen.findByText('Work item page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/projects/${TEST_PROJECT.id}/plan/${created.id}`);

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      title: 'Display module',
      percentComplete: 40,
      isMilestone: true,
      plannedStart: '2026-10-10',
      plannedEnd: '2026-10-20',
      phaseId: null,
    });
  });
});

describe('Requirement traceability', () => {
  it('shows work items, tests, defects with retest, and release history', async () => {
    mockApi(() => REQUIREMENT);
    renderInProject(
      'requirements/:recordId',
      <RequirementDetailPage />,
      `/projects/${TEST_PROJECT.id}/requirements/${REQUIREMENT.id}`,
    );

    const trace = await screen.findByRole('region', { name: 'Traceability' });
    expect(within(trace).getByRole('link', { name: /WI-001/ })).toHaveAttribute(
      'href',
      `/projects/${TEST_PROJECT.id}/plan/44444444-4444-4444-8444-444444444444`,
    );
    expect(within(trace).getByText('Failed')).toBeInTheDocument();
    expect(within(trace).getByText('For Retest')).toBeInTheDocument();
    expect(within(trace).getByRole('link', { name: /REL-001/ })).toBeInTheDocument();
    expect(within(trace).getByText('No acceptance yet')).toBeInTheDocument();
    expect(within(trace).getByText('Not planned for a release.')).toBeInTheDocument();
  });

  it('replaces the linked work item set', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi((url, init) => {
      if (init.method === 'PUT') return { ...REQUIREMENT, workItems: [] };
      return REQUIREMENT;
    });
    renderInProject(
      'requirements/:recordId',
      <RequirementDetailPage />,
      `/projects/${TEST_PROJECT.id}/requirements/${REQUIREMENT.id}`,
    );

    await user.click(await screen.findByRole('button', { name: 'Edit linked work items' }));
    await user.click(screen.getByRole('button', { name: 'Remove WI-001' }));
    await user.click(screen.getByRole('button', { name: 'Save links' }));

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[0]).toBe(
      `/api/projects/${TEST_PROJECT.id}/requirements/${REQUIREMENT.id}/work-items`,
    );
    expect(JSON.parse(put?.[1]?.body as string)).toEqual({ workItemIds: [] });
  });
});
