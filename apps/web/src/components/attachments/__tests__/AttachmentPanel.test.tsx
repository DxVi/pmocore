import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ATTACHMENT_MESSAGES, type Attachment } from '@pmocore/shared';
import { jsonResponse, renderWithProviders } from '@/test/render';
import { AttachmentPanel } from '../AttachmentPanel';

const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const PARENT_ID = '33333333-3333-4333-8333-333333333333';

const saved = (id: string, name: string, contentType = 'image/jpeg'): Attachment => ({
  id,
  projectId: PROJECT_ID,
  parentType: 'activity',
  parentId: PARENT_ID,
  originalName: name,
  contentType,
  extension: name.split('.').pop() ?? '',
  sizeBytes: 2048,
  captureSource: 'camera',
  uploadedBy: '11111111-1111-4111-8111-111111111111',
  uploadedByName: 'Test PM',
  uploadedAt: '2026-10-05T02:00:00.000Z',
  contentUrl: `/api/projects/${PROJECT_ID}/attachments/${id}/content`,
});

type Route = (url: string, init: RequestInit) => Response | Promise<Response>;

function mockApi(route: Route) {
  const fetchMock = vi.fn((url: string, init: RequestInit) => Promise.resolve(route(url, init)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const file = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

afterEach(() => vi.unstubAllGlobals());

describe('AttachmentPanel (design §10.2)', () => {
  it('offers camera, gallery and file inputs with the approved capture attributes', async () => {
    mockApi(() => jsonResponse(200, { success: true, data: [] }));
    renderWithProviders(
      <AttachmentPanel
        projectId={PROJECT_ID}
        parentType="activity"
        parentId={PARENT_ID}
        editable
      />,
    );

    expect(await screen.findByRole('button', { name: /Take photo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Photos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Files/ })).toBeInTheDocument();

    const camera = screen.getByTestId('attachment-camera-input');
    expect(camera).toHaveAttribute('capture', 'environment');
    expect(camera).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(camera).not.toHaveAttribute('multiple');

    const gallery = screen.getByTestId('attachment-gallery-input');
    expect(gallery).toHaveAttribute('multiple');
    expect(gallery).not.toHaveAttribute('capture');
    expect(gallery.getAttribute('accept')).not.toMatch(/heic/i);

    const files = screen.getByTestId('attachment-files-input');
    expect(files).toHaveAttribute('multiple');
    expect(files.getAttribute('accept')).toBe('.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.doc,.xls');
    expect(await screen.findByText('No attachments yet.')).toBeInTheDocument();
  });

  it('rejects HEIC and oversized photos before sending any bytes', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const fetchMock = mockApi(() => jsonResponse(200, { success: true, data: [] }));
    renderWithProviders(
      <AttachmentPanel
        projectId={PROJECT_ID}
        parentType="activity"
        parentId={PARENT_ID}
        editable
      />,
    );
    await screen.findByText('No attachments yet.');

    await user.upload(screen.getByTestId('attachment-gallery-input'), [
      file('IMG_0042.HEIC', 'image/heic'),
      file('huge.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1),
    ]);

    expect(await screen.findByText(ATTACHMENT_MESSAGES.heic)).toBeInTheDocument();
    expect(screen.getByText(ATTACHMENT_MESSAGES.tooLarge('10.0'))).toBeInTheDocument();
    const uploads = fetchMock.mock.calls.filter(([, init]) => init.method === 'POST');
    expect(uploads).toHaveLength(0);
  });

  it('uploads each file independently: a server rejection never blocks the others', async () => {
    const user = userEvent.setup();
    const list: Attachment[] = [];
    const fetchMock = mockApi((url, init) => {
      if (init.method === 'POST') {
        const form = init.body as FormData;
        const upload = form.get('file') as File;
        if (upload.name === 'bad.pdf') {
          return jsonResponse(415, {
            success: false,
            error: {
              code: 'UNSUPPORTED_FILE_TYPE',
              message: 'The file contents do not match its type.',
            },
          });
        }
        const item = saved(`4444444${list.length}-4444-4444-8444-444444444444`, upload.name);
        list.push(item);
        return jsonResponse(201, { success: true, data: item });
      }
      return jsonResponse(200, { success: true, data: [...list] });
    });
    renderWithProviders(
      <AttachmentPanel
        projectId={PROJECT_ID}
        parentType="activity"
        parentId={PARENT_ID}
        editable
      />,
    );
    await screen.findByText('No attachments yet.');

    await user.upload(screen.getByTestId('attachment-files-input'), [
      file('site.jpg', 'image/jpeg'),
      file('bad.pdf', 'application/pdf'),
      file('minutes.pdf', 'application/pdf'),
    ]);

    const uploads = screen.getByRole('list', { name: 'Uploads' });
    await waitFor(() => expect(within(uploads).getAllByText('Saved')).toHaveLength(2));
    expect(
      within(uploads).getByText('The file contents do not match its type.'),
    ).toBeInTheDocument();
    expect(within(uploads).getByText('Not uploaded')).toBeInTheDocument();

    const posts = fetchMock.mock.calls.filter(([, init]) => init.method === 'POST');
    expect(posts).toHaveLength(3);
    const form = posts[0]?.[1].body as FormData;
    expect(form.get('parentType')).toBe('activity');
    expect(form.get('parentId')).toBe(PARENT_ID);
    expect(form.get('captureSource')).toBe('file');
    expect(new Headers(posts[0]?.[1].headers).get('X-PMO-Request')).toBe('1');

    expect(await screen.findByRole('link', { name: 'site.jpg' })).toBeInTheDocument();
  });

  it('lists attachments with open and download links, and hides changes when read-only', async () => {
    mockApi(() =>
      jsonResponse(200, {
        success: true,
        data: [saved('55555555-5555-4555-8555-555555555555', 'minutes.pdf', 'application/pdf')],
      }),
    );
    renderWithProviders(
      <AttachmentPanel
        projectId={PROJECT_ID}
        parentType="activity"
        parentId={PARENT_ID}
        editable={false}
      />,
    );
    const link = await screen.findByRole('link', { name: 'minutes.pdf' });
    expect(link).toHaveAttribute('href', expect.stringMatching(/\/attachments\/5{8}.*\/content$/));
    expect(screen.getByRole('link', { name: /Download/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/\?download=1$/),
    );
    expect(screen.queryByRole('button', { name: /Take photo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
  });

  it('removes an attachment after confirmation', async () => {
    const user = userEvent.setup();
    let list = [saved('66666666-6666-4666-8666-666666666666', 'old.jpg')];
    const fetchMock = mockApi((_url, init) => {
      if (init.method === 'DELETE') {
        list = [];
        return jsonResponse(200, { success: true, data: { deleted: true } });
      }
      return jsonResponse(200, { success: true, data: list });
    });
    renderWithProviders(
      <AttachmentPanel
        projectId={PROJECT_ID}
        parentType="activity"
        parentId={PARENT_ID}
        editable
      />,
    );

    await user.click(await screen.findByRole('button', { name: /Remove/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('No attachments yet.')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          init.method === 'DELETE' && url.endsWith('66666666-6666-4666-8666-666666666666'),
      ),
    ).toBe(true);
  });
});
