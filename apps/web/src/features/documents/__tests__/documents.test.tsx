import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DocumentDetail } from '@pmocore/shared';
import {
  mockApi,
  recordMeta,
  renderInProject,
  TEST_PROJECT,
} from '@/features/plan/common/test-support';
import { DocumentCreatePage } from '../DocumentFormPage';
import { DocumentDetailPage } from '../DocumentDetailPage';

const DOCUMENT: DocumentDetail = {
  ...recordMeta('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'DOC-001'),
  phaseId: null,
  documentTypeId: null,
  title: 'Acceptance certificate',
  docVersion: '1.0',
  ownerName: 'PM',
  documentDate: '2026-10-12',
  statusId: null,
  linkUrl: 'https://drive.example.com/cert.pdf',
  relatedRequirementId: '33333333-3333-4333-8333-333333333333',
  relatedActivityId: null,
  relatedReleaseId: null,
  relatedWorkItemId: null,
  remarks: null,
  relatedRecord: {
    type: 'requirement',
    id: '33333333-3333-4333-8333-333333333333',
    code: 'REQ-001',
    title: 'Show ticket',
  },
  attachmentCount: 0,
};

afterEach(() => vi.unstubAllGlobals());

describe('Documents', () => {
  it('shows metadata, the external link, the related record and the attachment panel', async () => {
    mockApi(() => DOCUMENT);
    renderInProject(
      'documents/:recordId',
      <DocumentDetailPage />,
      `/projects/${TEST_PROJECT.id}/documents/${DOCUMENT.id}`,
    );

    expect(
      await screen.findByRole('heading', { name: 'Acceptance certificate' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /drive\.example\.com/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByRole('link', { name: /REQ-001/ })).toHaveAttribute(
      'href',
      `/projects/${TEST_PROJECT.id}/requirements/${DOCUMENT.relatedRecord?.id}`,
    );
    // AttachmentPanel contract mounted with parentType="document" (implementation arrives with PKG-2).
    expect(screen.getByRole('heading', { name: 'Attachments' })).toBeInTheDocument();
  });

  it('rejects non-http links and saves one related record', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi((_url, init) => (init?.method === 'POST' ? [201, DOCUMENT] : []));
    renderInProject(
      'documents/new',
      <DocumentCreatePage />,
      `/projects/${TEST_PROJECT.id}/documents/new`,
      [{ path: 'documents/:recordId', element: <p>Document page</p> }],
    );

    await user.type(await screen.findByLabelText(/^Title/), 'Acceptance certificate');
    await user.type(screen.getByLabelText('External link'), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Save and add files' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    await user.clear(screen.getByLabelText('External link'));
    await user.type(screen.getByLabelText('External link'), 'https://drive.example.com/cert.pdf');
    await user.click(screen.getByRole('button', { name: 'Save and add files' }));
    expect(await screen.findByText('Document page')).toBeInTheDocument();

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toMatchObject({
      title: 'Acceptance certificate',
      linkUrl: 'https://drive.example.com/cert.pdf',
      relatedRequirementId: null,
      relatedActivityId: null,
    });
  });
});
