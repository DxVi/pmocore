import type { AttachmentParentType } from '@pmocore/shared';

/**
 * AttachmentPanel props — frozen PKG-1 contract (tasks.md §3.3).
 * PKG-2 implements the body in this directory (file, gallery and camera capture,
 * per-file upload states, view/download/remove) without changing these props.
 * PKG-3 mounts it on document details with parentType="document".
 */
export type AttachmentPanelProps = {
  projectId: string;
  parentType: AttachmentParentType;
  parentId: string;
  /** False when the parent is read-only (e.g. archived project): hides upload and remove. */
  editable: boolean;
};

export function AttachmentPanel({ parentType }: AttachmentPanelProps) {
  return (
    <section className="card" aria-labelledby={`attachments-${parentType}`}>
      <div className="card-body">
        <h2 id={`attachments-${parentType}`} className="h6 mb-2">
          Attachments
        </h2>
        <p className="text-secondary small mb-0">
          Attachments become available in a later release.
        </p>
      </div>
    </section>
  );
}
