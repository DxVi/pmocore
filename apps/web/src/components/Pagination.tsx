import type { PaginationMeta } from '@pmocore/shared';

type PaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
};

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) {
    return <p className="text-secondary small mt-3 mb-0">{meta.totalItems} record(s)</p>;
  }
  return (
    <nav
      aria-label="Pagination"
      className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"
    >
      <span className="text-secondary small">
        Page {meta.page} of {meta.totalPages} · {meta.totalItems} record(s)
      </span>
      <div className="btn-group">
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
