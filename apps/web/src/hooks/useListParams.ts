import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * List state (search, filters, sort, page) kept in the URL so it survives
 * reloads and the back button, without a saved-views system (REQ-065).
 */
export function useListParams<T extends Record<string, string>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => {
    const result: Record<string, string> = { ...defaults };
    for (const [key, value] of searchParams.entries()) result[key] = value;
    return result as T & Record<string, string>;
  }, [defaults, searchParams]);

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || value === defaults[key]) next.delete(key);
            else next.set(key, value);
          }
          // Any filter change returns to the first page.
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [defaults, setSearchParams],
  );

  const reset = useCallback(
    () => setSearchParams(new URLSearchParams(), { replace: true }),
    [setSearchParams],
  );

  return { values, update, reset };
}
