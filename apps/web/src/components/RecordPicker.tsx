import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { LookupResult, LookupType, RecordRef } from '@pmocore/shared';
import { apiClient, toQueryString } from '@/lib/api-client';

type BaseProps = {
  projectId: string;
  type: LookupType;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: RecordRef | null;
  onChange: (value: RecordRef | null) => void;
};

type MultiProps = BaseProps & {
  multiple: true;
  value: RecordRef[];
  onChange: (value: RecordRef[]) => void;
};

/**
 * Searchable picker over `/lookup` for real record relationships (design §8.2),
 * so links never depend on typed IDs in free text.
 */
export function RecordPicker(props: SingleProps | MultiProps) {
  const {
    projectId,
    type,
    label,
    placeholder = 'Search by code or title…',
    disabled,
    error,
  } = props;
  const id = useId();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);

  const { data, isFetching } = useQuery({
    queryKey: ['projects', projectId, 'lookup', type, term],
    queryFn: () =>
      apiClient.get<LookupResult>(
        `/projects/${projectId}/lookup${toQueryString({ type, q: term, limit: 10 })}`,
      ),
    enabled: open && !disabled,
  });

  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedIds = new Set(selected.map((item) => item.id));
  const results = (data ?? []).filter((item) => !selectedIds.has(item.id));

  const choose = (item: RecordRef) => {
    if (props.multiple) props.onChange([...props.value, item]);
    else props.onChange(item);
    setText('');
    setOpen(false);
  };

  const remove = (item: RecordRef) => {
    if (props.multiple) props.onChange(props.value.filter((v) => v.id !== item.id));
    else props.onChange(null);
  };

  const showInput = props.multiple || !props.value;

  return (
    <div className="mb-3 position-relative">
      <label htmlFor={id} className="form-label fw-medium">
        {label}
      </label>
      {selected.length > 0 && (
        <ul className="list-unstyled d-flex flex-wrap gap-2 mb-2">
          {selected.map((item) => (
            <li
              key={item.id}
              className="badge pmo-badge pmo-badge-neutral d-flex align-items-center gap-1"
            >
              <span className="text-truncate" style={{ maxWidth: '16rem' }}>
                {item.code} · {item.title}
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="btn btn-sm p-0 border-0 lh-1"
                  aria-label={`Remove ${item.code}`}
                  onClick={() => remove(item)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {showInput && (
        <input
          id={id}
          type="search"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-results`}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
        />
      )}
      {open && showInput && (
        <ul
          id={`${id}-results`}
          role="listbox"
          className="list-group position-absolute w-100 shadow-sm pmo-picker-results"
        >
          {isFetching && results.length === 0 && (
            <li className="list-group-item text-secondary">Searching…</li>
          )}
          {!isFetching && results.length === 0 && (
            <li className="list-group-item text-secondary">No matching records</li>
          )}
          {results.map((item) => (
            <li
              key={item.id}
              role="option"
              aria-selected="false"
              className="list-group-item list-group-item-action p-0"
            >
              <button
                type="button"
                className="btn w-100 text-start px-3 py-2"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="fw-semibold me-2">{item.code}</span>
                <span className="text-break">{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}
