import type { ReactNode } from 'react';

type DerivedValueProps<T> = {
  value: T | null | undefined;
  render?: (value: T) => ReactNode;
  /** Explicit wording for missing data — never rendered as zero, complete, or healthy (REQ-010). */
  unavailable?: string;
};

export function DerivedValue<T>({
  value,
  render,
  unavailable = 'Not available',
}: DerivedValueProps<T>) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-secondary fst-italic">{unavailable}</span>;
  }
  return <>{render ? render(value) : String(value)}</>;
}
