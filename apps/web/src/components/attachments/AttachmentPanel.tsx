import { useRef, useState, type ChangeEvent, type CSSProperties, type RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Images,
  Paperclip,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  ATTACHMENT_ACCEPT,
  type Attachment,
  type AttachmentCaptureSource,
  type AttachmentParentType,
} from '@pmocore/shared';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { ApiClientError } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import {
  PARENT_MODULE_KEY,
  attachmentKeys,
  removeAttachment,
  uploadAttachment,
  useAttachments,
} from './attachment-api';
import { formatSize, precheckFile } from './file-checks';

/**
 * AttachmentPanel props — frozen PKG-1 contract (tasks.md §3.3).
 * PKG-3 mounts this on document details with parentType="document".
 */
export type AttachmentPanelProps = {
  projectId: string;
  parentType: AttachmentParentType;
  parentId: string;
  /** False when the parent is read-only (e.g. archived project): hides upload and remove. */
  editable: boolean;
};

type QueueStatus = 'queued' | 'uploading' | 'saved' | 'rejected' | 'failed';

type QueueItem = {
  key: string;
  file: File;
  source: AttachmentCaptureSource;
  status: QueueStatus;
  message?: string;
};

const MAX_CONCURRENT_UPLOADS = 2;
const THUMB_STYLE: CSSProperties = { width: '4rem', height: '4rem' };
const THUMB_IMAGE_STYLE: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
let queueSequence = 0;

/**
 * Meetings & Visits attachments (REQ-035–043) and reusable document attachments
 * (REQ-061): native camera capture, gallery and file selection, one request per
 * file with independent status, view/download, and removal.
 */
export function AttachmentPanel({
  projectId,
  parentType,
  parentId,
  editable,
}: AttachmentPanelProps) {
  const queryClient = useQueryClient();
  const attachments = useAttachments(projectId, parentType, parentId);
  const [queue, setQueueState] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string>();

  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  const setQueue = (next: QueueItem[]) => {
    queueRef.current = next;
    setQueueState(next);
  };
  const patch = (key: string, change: Partial<QueueItem>) =>
    setQueue(queueRef.current.map((item) => (item.key === key ? { ...item, ...change } : item)));

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: attachmentKeys.list(projectId, parentType, parentId),
    });
    void queryClient.invalidateQueries({
      queryKey: ['projects', projectId, PARENT_MODULE_KEY[parentType]],
    });
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'overview'] });
  };

  const start = (item: QueueItem) => {
    patch(item.key, { status: 'uploading', message: undefined });
    uploadAttachment(projectId, parentType, parentId, item.file, item.source)
      .then(() => {
        patch(item.key, { status: 'saved' });
        refresh();
      })
      .catch((error: unknown) => {
        // Validation rejections are final; transient failures can be retried.
        const final =
          error instanceof ApiClientError && [400, 404, 409, 413, 415].includes(error.status);
        patch(item.key, { status: final ? 'rejected' : 'failed', message: errorMessage(error) });
      })
      .finally(pump);
  };

  function pump() {
    const active = queueRef.current.filter((item) => item.status === 'uploading').length;
    queueRef.current
      .filter((item) => item.status === 'queued')
      .slice(0, Math.max(0, MAX_CONCURRENT_UPLOADS - active))
      .forEach(start);
  }

  const addFiles = (files: FileList | null, source: AttachmentCaptureSource) => {
    if (!files || files.length === 0) return;
    const added: QueueItem[] = Array.from(files).map((file) => {
      const problem = precheckFile(file);
      queueSequence += 1;
      return {
        key: `upload-${queueSequence}`,
        file,
        source,
        status: problem ? 'rejected' : 'queued',
        message: problem ?? undefined,
      };
    });
    setQueue([...queueRef.current, ...added]);
    pump();
  };

  const retry = (key: string) => {
    patch(key, { status: 'queued', message: undefined });
    pump();
  };

  const clearFinished = () =>
    setQueue(
      queueRef.current.filter((item) => item.status === 'queued' || item.status === 'uploading'),
    );

  const confirmRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    setRemoveError(undefined);
    try {
      await removeAttachment(projectId, removing.id);
      setRemoving(null);
      refresh();
    } catch (error) {
      setRemoveError(errorMessage(error));
    } finally {
      setRemoveBusy(false);
    }
  };

  const pick = (input: RefObject<HTMLInputElement | null>) => input.current?.click();
  const onInput = (event: ChangeEvent<HTMLInputElement>, source: AttachmentCaptureSource) => {
    addFiles(event.target.files, source);
    // Allow selecting the same file again later.
    event.target.value = '';
  };

  const list = attachments.data ?? [];
  const finished = queue.some((item) => item.status !== 'queued' && item.status !== 'uploading');

  return (
    <section className="card" aria-labelledby={`attachments-${parentId}`}>
      <div className="card-body">
        <h2 id={`attachments-${parentId}`} className="h5 mb-3 d-flex align-items-center gap-2">
          <Paperclip size={18} aria-hidden="true" />
          Attachments
          {list.length > 0 && (
            <span className="badge pmo-badge pmo-badge-neutral">{list.length}</span>
          )}
        </h2>

        {editable && (
          <>
            <div className="d-grid gap-2 d-sm-flex mb-3">
              <button type="button" className="btn btn-primary" onClick={() => pick(cameraInput)}>
                <Camera size={18} aria-hidden="true" className="me-2" />
                Take photo
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => pick(galleryInput)}
              >
                <Images size={18} aria-hidden="true" className="me-2" />
                Photos
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => pick(filesInput)}
              >
                <FileText size={18} aria-hidden="true" className="me-2" />
                Files
              </button>
            </div>
            <input
              ref={cameraInput}
              type="file"
              className="d-none"
              accept={ATTACHMENT_ACCEPT.camera}
              capture="environment"
              data-testid="attachment-camera-input"
              onChange={(event) => onInput(event, 'camera')}
            />
            <input
              ref={galleryInput}
              type="file"
              className="d-none"
              accept={ATTACHMENT_ACCEPT.gallery}
              multiple
              data-testid="attachment-gallery-input"
              onChange={(event) => onInput(event, 'gallery')}
            />
            <input
              ref={filesInput}
              type="file"
              className="d-none"
              accept={ATTACHMENT_ACCEPT.files}
              multiple
              data-testid="attachment-files-input"
              onChange={(event) => onInput(event, 'file')}
            />
            <p className="form-text mt-0 mb-3">
              PDF, Word, Excel, JPG, PNG or WEBP · up to 10 MB each.
            </p>
          </>
        )}

        {queue.length > 0 && (
          <ul className="list-group mb-3" aria-label="Uploads">
            {queue.map((item) => (
              <li
                key={item.key}
                className="list-group-item d-flex flex-wrap align-items-center gap-2"
                data-status={item.status}
              >
                <span className="text-break flex-grow-1">
                  {item.file.name || 'Photo'}{' '}
                  <span className="text-secondary small">({formatSize(item.file.size)})</span>
                  {item.message && (
                    <span className="d-block small text-danger" role="alert">
                      {item.message}
                    </span>
                  )}
                </span>
                {item.status === 'queued' && <span className="small text-secondary">Waiting…</span>}
                {item.status === 'uploading' && (
                  <span className="small text-secondary d-flex align-items-center gap-1">
                    <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                    Uploading…
                  </span>
                )}
                {item.status === 'saved' && (
                  <span className="small text-success d-flex align-items-center gap-1">
                    <CheckCircle2 size={16} aria-hidden="true" /> Saved
                  </span>
                )}
                {item.status === 'rejected' && (
                  <span className="small text-danger d-flex align-items-center gap-1">
                    <XCircle size={16} aria-hidden="true" /> Not uploaded
                  </span>
                )}
                {item.status === 'failed' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => retry(item.key)}
                  >
                    <RotateCcw size={14} aria-hidden="true" className="me-1" />
                    Retry
                  </button>
                )}
              </li>
            ))}
            {finished && (
              <li className="list-group-item text-end">
                <button type="button" className="btn btn-sm btn-link" onClick={clearFinished}>
                  Clear finished
                </button>
              </li>
            )}
          </ul>
        )}

        {attachments.isLoading && <LoadingState label="Loading attachments…" />}
        {attachments.error && (
          <ErrorState error={attachments.error} onRetry={() => void attachments.refetch()} />
        )}
        {!attachments.isLoading && !attachments.error && list.length === 0 && (
          <p className="text-secondary mb-0">No attachments yet.</p>
        )}

        {list.length > 0 && (
          <ul className="list-unstyled d-grid gap-3 mb-0">
            {list.map((attachment) => {
              const isImage = attachment.contentType.startsWith('image/');
              return (
                <li key={attachment.id} className="d-flex gap-3 align-items-start">
                  <a
                    href={attachment.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 d-flex align-items-center justify-content-center border rounded overflow-hidden"
                    style={THUMB_STYLE}
                    aria-label={`Open ${attachment.originalName}`}
                  >
                    {isImage ? (
                      <img
                        src={attachment.contentUrl}
                        alt=""
                        loading="lazy"
                        style={THUMB_IMAGE_STYLE}
                      />
                    ) : (
                      <FileText size={28} aria-hidden="true" />
                    )}
                  </a>
                  <div className="flex-grow-1 min-w-0">
                    <a
                      href={attachment.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fw-medium text-break d-block"
                    >
                      {attachment.originalName}
                    </a>
                    <div className="small text-secondary">
                      {attachment.extension.toUpperCase()} · {formatSize(attachment.sizeBytes)} ·{' '}
                      {attachment.uploadedByName} · {formatDateTime(attachment.uploadedAt)}
                      {attachment.captureSource === 'camera' && ' · Camera'}
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      <a
                        href={attachment.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-secondary"
                      >
                        <ExternalLink size={14} aria-hidden="true" className="me-1" />
                        Open
                      </a>
                      <a
                        href={`${attachment.contentUrl}?download=1`}
                        download={attachment.originalName}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        <Download size={14} aria-hidden="true" className="me-1" />
                        Download
                      </a>
                      {editable && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            setRemoveError(undefined);
                            setRemoving(attachment);
                          }}
                        >
                          <Trash2 size={14} aria-hidden="true" className="me-1" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remove attachment?"
        message={`"${removing?.originalName ?? ''}" will be removed from this record.`}
        confirmLabel="Remove"
        tone="danger"
        busy={removeBusy}
        error={removeError}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void confirmRemove()}
      />
    </section>
  );
}
