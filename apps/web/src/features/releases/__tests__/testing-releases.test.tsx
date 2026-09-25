import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReleaseDetail, TestCase } from '@pmocore/shared';
import {
  mockApi,
  recordMeta,
  renderInProject,
  TEST_PROJECT,
} from '@/features/plan/common/test-support';
import { TestingListPage } from '@/features/testing/TestingListPage';
import { ReleaseDetailPage } from '../ReleaseDetailPage';

const RELEASE: ReleaseDetail = {
  ...recordMeta('88888888-8888-4888-8888-888888888888', 'REL-001'),
  versionLabel: 'v1.0',
  name: 'Pilot',
  plannedDate: null,
  releaseDate: '2026-10-10',
  environmentId: null,
  scope: null,
  deploymentStatusId: null,
  demoDate: null,
  uatDate: null,
  uatResultId: null,
  deliveryDate: null,
  trainingDate: null,
  remarks: null,
  includedRequirements: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      code: 'REQ-001',
      title: 'Show ticket',
      note: 'initial',
    },
  ],
  includedDefects: [],
  acceptances: [
    {
      ...recordMeta('99999999-9999-4999-8999-999999999992', 'ACC-002'),
      releaseId: '88888888-8888-4888-8888-888888888888',
      statusId: 3,
      acceptanceDate: '2026-10-12',
      acceptedBy: 'Registrar',
      certificateRef: 'CERT-01',
      certificateDocumentId: null,
      handoverNotes: null,
      remarks: null,
    },
    {
      ...recordMeta('99999999-9999-4999-8999-999999999991', 'ACC-001'),
      releaseId: '88888888-8888-4888-8888-888888888888',
      statusId: 2,
      acceptanceDate: null,
      acceptedBy: 'Registrar',
      certificateRef: null,
      certificateDocumentId: null,
      handoverNotes: null,
      remarks: 'Font too small',
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('Testing & Defects list', () => {
  it('shows latest results, keeping Failed and For Retest distinct, and switches to defects', async () => {
    const user = userEvent.setup();
    const tests: TestCase[] = [
      {
        ...recordMeta('55555555-5555-4555-8555-555555555551', 'TC-001'),
        module: null,
        requirementId: null,
        stageId: 70,
        scenario: 'Readable at 10 m',
        expectedResult: null,
        actualResult: null,
        testerName: null,
        testDate: null,
        resultId: 60,
        statusId: null,
        evidence: null,
        remarks: null,
      },
      {
        ...recordMeta('55555555-5555-4555-8555-555555555552', 'TC-002'),
        module: null,
        requirementId: null,
        stageId: 70,
        scenario: 'Audio call-out',
        expectedResult: null,
        actualResult: null,
        testerName: null,
        testDate: null,
        resultId: 61,
        statusId: null,
        evidence: null,
        remarks: null,
      },
    ];
    const fetchMock = mockApi((url) => (url.includes('/defects') ? [] : tests));
    renderInProject('testing', <TestingListPage />, `/projects/${TEST_PROJECT.id}/testing`);

    expect((await screen.findAllByText('Failed')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('For Retest').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Defects' }));
    expect(await screen.findByText('No defects found.')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        url.startsWith(`/api/projects/${TEST_PROJECT.id}/defects`),
      ),
    ).toBe(true);
    expect(screen.getByRole('link', { name: /New defect/ })).toBeInTheDocument();
  });
});

describe('Release detail', () => {
  it('shows scope with notes and acceptance history newest first', async () => {
    mockApi(() => RELEASE);
    renderInProject(
      'releases/:recordId',
      <ReleaseDetailPage />,
      `/projects/${TEST_PROJECT.id}/releases/${RELEASE.id}`,
    );

    const scope = await screen.findByRole('region', { name: 'Included in this release' });
    expect(within(scope).getByRole('link', { name: /REQ-001/ })).toBeInTheDocument();
    expect(within(scope).getByText('initial')).toBeInTheDocument();

    const history = screen.getByRole('list', { name: 'Acceptance history (newest first)' });
    const entries = within(history).getAllByRole('listitem');
    expect(within(entries[0]).getByText('ACC-002')).toBeInTheDocument();
    expect(within(entries[0]).getByText('Current')).toBeInTheDocument();
    expect(within(entries[1]).getByText('Font too small')).toBeInTheDocument();
  });

  it('saves the requirement scope with notes', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(() => RELEASE);
    renderInProject(
      'releases/:recordId',
      <ReleaseDetailPage />,
      `/projects/${TEST_PROJECT.id}/releases/${RELEASE.id}`,
    );

    await user.click(await screen.findByRole('button', { name: 'Edit included requirements' }));
    const note = screen.getByLabelText('Note for REQ-001');
    await user.clear(note);
    await user.type(note, 'revision 2');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[0]).toBe(`/api/projects/${TEST_PROJECT.id}/releases/${RELEASE.id}/requirements`);
    expect(JSON.parse(put?.[1]?.body as string)).toEqual({
      items: [{ requirementId: '33333333-3333-4333-8333-333333333333', note: 'revision 2' }],
    });
  });

  it('records a new acceptance', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi((_url, init) =>
      init?.method === 'POST' ? [201, RELEASE.acceptances[0]] : RELEASE,
    );
    renderInProject(
      'releases/:recordId',
      <ReleaseDetailPage />,
      `/projects/${TEST_PROJECT.id}/releases/${RELEASE.id}`,
    );

    await user.click(await screen.findByRole('button', { name: /Record acceptance/ }));
    const form = screen.getByRole('form', { name: 'New acceptance' });
    await user.type(within(form).getByLabelText('Accepted by'), 'Registrar');
    await user.type(within(form).getByLabelText('Certificate / document reference'), 'CERT-02');
    await user.click(within(form).getByRole('button', { name: 'Add acceptance' }));

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe(`/api/projects/${TEST_PROJECT.id}/releases/${RELEASE.id}/acceptances`);
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      acceptedBy: 'Registrar',
      certificateRef: 'CERT-02',
      acceptanceDate: null,
    });
  });
});
