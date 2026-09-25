import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hide on the mobile card layout (e.g. secondary metadata). */
  hideOnCard?: boolean;
  className?: string;
};

type DataListProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Card title for the mobile layout; defaults to the first column. */
  cardTitle?: (row: T) => ReactNode;
  caption?: string;
};

/**
 * One column definition rendered as a table on md+ screens and as stacked
 * cards on phones, so listings never require horizontal page scrolling.
 */
export function DataList<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  cardTitle,
  caption,
}: DataListProps<T>) {
  const [first, ...rest] = columns;
  const activate = (row: T) => onRowClick?.(row);

  return (
    <>
      <div className="table-responsive d-none d-md-block" data-testid="datalist-table">
        <table className="table table-hover align-middle mb-0">
          {caption && <caption className="visually-hidden">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'pmo-clickable' : undefined}
                onClick={onRowClick ? () => activate(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="list-unstyled d-md-none mb-0 d-grid gap-2" data-testid="datalist-cards">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <div
              className={`card ${onRowClick ? 'pmo-clickable' : ''}`}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => activate(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        activate(row);
                      }
                    }
                  : undefined
              }
            >
              <div className="card-body p-3">
                <div className="fw-semibold mb-2 text-break">
                  {cardTitle ? cardTitle(row) : first?.render(row)}
                </div>
                <dl className="row small mb-0 gy-1">
                  {rest
                    .filter((column) => !column.hideOnCard)
                    .map((column) => (
                      <div key={column.key} className="col-6 d-flex flex-column">
                        <dt className="text-secondary fw-normal">{column.header}</dt>
                        <dd className="mb-0 text-break">{column.render(row)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
