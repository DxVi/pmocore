import type { ReactNode } from 'react';
import type { FieldError } from 'react-hook-form';

type FieldProps = {
  id: string;
  label: string;
  error?: FieldError | { message?: string };
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label, control, hint and inline error for one form field. */
export function Field({ id, label, error, hint, required, className = '', children }: FieldProps) {
  return (
    <div className={`mb-3 ${className}`.trim()}>
      <label htmlFor={id} className="form-label fw-medium">
        {label}
        {required && (
          <span className="text-danger ms-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <div className="form-text">{hint}</div>}
      {error?.message && (
        <div className="invalid-feedback d-block" role="alert">
          {error.message}
        </div>
      )}
    </div>
  );
}
