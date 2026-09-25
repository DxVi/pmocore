/**
 * Small presentational pieces shared by the Package 3 modules. Built only on the
 * PKG-1 component kit and Bootstrap utilities (no new visual system).
 */
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { UseMutationResult } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import type { ReferenceCategory } from '@pmocore/shared';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DerivedValue } from '@/components/DerivedValue';
import { Field } from '@/components/form/Field';
import { RefOptions } from '@/components/RefOptions';
import { errorMessage } from '@/lib/errors';

type FieldError = { message?: string } | undefined;

export function Detail({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`${wide ? 'col-12' : 'col-6 col-md-4'} mb-3`}>
      <dt className="small text-secondary fw-normal">{label}</dt>
      <dd className="mb-0 pmo-prewrap text-break">{children}</dd>
    </div>
  );
}

export function TextValue({
  value,
  unavailable = '—',
}: {
  value: string | null | undefined;
  unavailable?: string;
}) {
  return <DerivedValue value={value} unavailable={unavailable} />;
}

export function ArchivedNotice() {
  return <div className="alert alert-secondary">This project is archived and read-only.</div>;
}

type InputProps = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
};

export function TextInput({
  type = 'text',
  ...props
}: InputProps & { type?: 'text' | 'date' | 'number' | 'url' }) {
  return (
    <Field
      id={props.id}
      label={props.label}
      error={props.error}
      required={props.required}
      hint={props.hint}
    >
      <input
        id={props.id}
        type={type}
        disabled={props.disabled}
        className={`form-control ${props.error ? 'is-invalid' : ''}`}
        {...(type === 'number' ? { inputMode: 'numeric' as const } : {})}
        {...props.registration}
      />
    </Field>
  );
}

export function TextArea({ rows = 3, ...props }: InputProps & { rows?: number }) {
  return (
    <Field
      id={props.id}
      label={props.label}
      error={props.error}
      required={props.required}
      hint={props.hint}
    >
      <textarea
        id={props.id}
        rows={rows}
        className={`form-control ${props.error ? 'is-invalid' : ''}`}
        {...props.registration}
      />
    </Field>
  );
}

export function RefSelect({
  category,
  currentId,
  emptyLabel,
  ...props
}: InputProps & { category: ReferenceCategory; currentId?: number | null; emptyLabel?: string }) {
  return (
    <Field
      id={props.id}
      label={props.label}
      error={props.error}
      required={props.required}
      hint={props.hint}
    >
      <select id={props.id} className="form-select" {...props.registration}>
        <RefOptions category={category} currentId={currentId} emptyLabel={emptyLabel} />
      </select>
    </Field>
  );
}

/** Edit and Delete actions for a record detail page; deletion is confirmed. */
export function RecordActions({
  entity,
  deleteMessage,
  remove,
  afterDelete = '..',
}: {
  entity: string;
  deleteMessage: string;
  remove: UseMutationResult<unknown, Error, void>;
  afterDelete?: string;
}) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Link to="edit" className="btn btn-primary">
        <Pencil size={16} aria-hidden="true" className="me-1" />
        Edit
      </Link>
      <button type="button" className="btn btn-outline-danger" onClick={() => setConfirming(true)}>
        <Trash2 size={16} aria-hidden="true" className="me-1" />
        Delete
      </button>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${entity}?`}
        message={deleteMessage}
        confirmLabel="Delete"
        tone="danger"
        busy={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : undefined}
        onCancel={() => {
          remove.reset();
          setConfirming(false);
        }}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => void navigate(afterDelete, { relative: 'path' }),
          })
        }
      />
    </>
  );
}

/** Save/cancel bar for Package 3 forms (sticky on phones via the PKG-1 styles). */
export function FormActions({
  cancelTo,
  submitting,
  submitLabel,
}: {
  cancelTo: string;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="d-flex flex-column-reverse flex-sm-row gap-2 justify-content-sm-end pmo-form-actions">
      <Link to={cancelTo} relative="path" className="btn btn-outline-secondary">
        Cancel
      </Link>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting && (
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        )}
        {submitLabel}
      </button>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  );
}
