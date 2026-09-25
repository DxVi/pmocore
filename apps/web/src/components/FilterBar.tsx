import { useEffect, useId, useState, type ReactNode } from 'react';
import { Filter, Search } from 'lucide-react';

export type SortOption = { value: string; label: string };

type FilterBarProps = {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  /** Additional filter controls (selects, toggles). */
  children?: ReactNode;
  sort?: { value: string; options: SortOption[]; onChange: (value: string) => void };
  onClear?: () => void;
};

/** Search, filters and sort for operational lists (REQ-062/063). Filters collapse on phones. */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  children,
  sort,
  onClear,
}: FilterBarProps) {
  const id = useId();
  const [text, setText] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  const [open, setOpen] = useState(false);

  // Adopt external changes (e.g. "Clear filters") without an effect.
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setText(search);
  }

  // Debounce typing so each keystroke does not trigger a request.
  useEffect(() => {
    if (text === search) return;
    const timer = window.setTimeout(() => onSearch(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text, search, onSearch]);

  return (
    <div className="mb-3">
      <div className="d-flex gap-2">
        <div className="input-group flex-grow-1">
          <span className="input-group-text" aria-hidden="true">
            <Search size={16} />
          </span>
          <input
            id={`${id}-search`}
            type="search"
            className="form-control"
            placeholder={searchPlaceholder}
            aria-label="Search"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        {(children || sort) && (
          <button
            type="button"
            className="btn btn-outline-secondary d-md-none"
            aria-expanded={open}
            aria-controls={`${id}-filters`}
            onClick={() => setOpen((value) => !value)}
          >
            <Filter size={16} aria-hidden="true" /> Filters
          </button>
        )}
      </div>

      {(children || sort || onClear) && (
        <div
          id={`${id}-filters`}
          className={`${open ? 'd-flex' : 'd-none'} d-md-flex flex-column flex-md-row flex-wrap gap-2 mt-2 align-items-md-end`}
        >
          {children}
          {sort && (
            <div className="pmo-filter-field">
              <label htmlFor={`${id}-sort`} className="form-label small text-secondary mb-1">
                Sort by
              </label>
              <select
                id={`${id}-sort`}
                className="form-select form-select-sm"
                value={sort.value}
                onChange={(event) => sort.onChange(event.target.value)}
              >
                {sort.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {onClear && (
            <button type="button" className="btn btn-sm btn-link px-0 px-md-2" onClick={onClear}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
};

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
}: FilterSelectProps) {
  const id = useId();
  return (
    <div className="pmo-filter-field">
      <label htmlFor={id} className="form-label small text-secondary mb-1">
        {label}
      </label>
      <select
        id={id}
        className="form-select form-select-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
