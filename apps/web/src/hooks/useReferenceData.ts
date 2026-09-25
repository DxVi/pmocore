import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ReferenceCategory, ReferenceDataResponse, ReferenceValue } from '@pmocore/shared';
import { apiClient } from '@/lib/api-client';

export const REFERENCE_QUERY_KEY = ['reference-data'] as const;

/** Reference data changes only through the seed, so it is cached for the session. */
export function useReferenceData() {
  const query = useQuery({
    queryKey: REFERENCE_QUERY_KEY,
    queryFn: () => apiClient.get<ReferenceDataResponse>('/reference-data'),
    staleTime: Infinity,
  });

  const byId = useMemo(
    () => new Map((query.data?.values ?? []).map((value) => [value.id, value])),
    [query.data],
  );

  const options = useCallback(
    (category: ReferenceCategory, includeId?: number | null): ReferenceValue[] =>
      (query.data?.values ?? []).filter(
        (value) => value.category === category && (value.isActive || value.id === includeId),
      ),
    [query.data],
  );

  const label = useCallback(
    (id: number | null | undefined) => (id ? byId.get(id)?.label : undefined),
    [byId],
  );

  return { ...query, byId, options, label };
}

/** True when a category has selectable values; fields for empty categories are hidden (design §6.2). */
export function useHasReferenceValues(category: ReferenceCategory) {
  const { options } = useReferenceData();
  return options(category).length > 0;
}
