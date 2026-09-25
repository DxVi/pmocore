import { useEffect, useId, useRef } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger' | 'warning';
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** React-controlled modal (no Bootstrap JS dependency) for archive/delete confirmations. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'primary',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <>
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id={titleId} className="modal-title h5">
                {title}
              </h2>
            </div>
            <div className="modal-body">
              <p className="mb-0">{message}</p>
              {error && (
                <div className="alert alert-danger mt-3 mb-0" role="alert">
                  {error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                ref={cancelRef}
                type="button"
                className="btn btn-outline-secondary"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-${tone}`}
                disabled={busy}
                onClick={onConfirm}
              >
                {busy && (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
