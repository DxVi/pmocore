import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/errors';

type QueryStateProps = {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
};

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="d-flex align-items-center gap-2 text-secondary py-4" role="status">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      className="alert alert-danger d-flex flex-column flex-sm-row gap-2 align-items-sm-center"
      role="alert"
    >
      <span className="flex-grow-1">{errorMessage(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="text-center text-secondary border rounded py-5 px-3">
      <p className="mb-3">{message}</p>
      {action}
    </div>
  );
}

/** Standard loading, error and empty states for operational screens (REQ-064). */
export function QueryState({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'No records yet.',
  emptyAction,
  onRetry,
  children,
}: QueryStateProps) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState message={emptyMessage} action={emptyAction} />;
  return <>{children}</>;
}
