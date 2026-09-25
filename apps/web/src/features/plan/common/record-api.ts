/**
 * Data hooks shared by the Package 3 modules (plan, requirements, testing,
 * releases, documents). Every query is keyed under ['projects', projectId, ...].
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, toQueryString } from '@/lib/api-client';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

export function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Traceability spans modules, so any change refreshes the project's cached records. */
export function useInvalidateProject(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
}

export function createRecordApi<TListItem, TDetail, TCreate, TUpdate>(segment: string) {
  const path = (projectId: string) => `/projects/${projectId}/${segment}`;
  const keys = {
    all: (projectId: string) => ['projects', projectId, segment] as const,
    list: (projectId: string, params: QueryParams) =>
      ['projects', projectId, segment, 'list', params] as const,
    detail: (projectId: string, id: string) => ['projects', projectId, segment, id] as const,
  };

  return {
    keys,
    useList(projectId: string, params: QueryParams) {
      return useQuery({
        queryKey: keys.list(projectId, params),
        queryFn: () => apiClient.list<TListItem>(`${path(projectId)}${toQueryString(params)}`),
        placeholderData: keepPreviousData,
      });
    },
    useDetail(projectId: string, id: string) {
      return useQuery({
        queryKey: keys.detail(projectId, id),
        queryFn: () => apiClient.get<TDetail>(`${path(projectId)}/${id}`),
      });
    },
    useCreate(projectId: string) {
      const invalidate = useInvalidateProject(projectId);
      return useMutation({
        mutationFn: (input: TCreate) => apiClient.post<TDetail>(path(projectId), input),
        onSuccess: invalidate,
      });
    },
    useUpdate(projectId: string, id: string) {
      const invalidate = useInvalidateProject(projectId);
      return useMutation({
        mutationFn: (input: TUpdate) => apiClient.put<TDetail>(`${path(projectId)}/${id}`, input),
        onSuccess: invalidate,
      });
    },
    useDelete(projectId: string, id: string) {
      const invalidate = useInvalidateProject(projectId);
      return useMutation({
        mutationFn: () => apiClient.delete(`${path(projectId)}/${id}`),
        onSuccess: invalidate,
      });
    },
    /** PUT to a sub-resource of one record (e.g. link sets, release scope). */
    useReplace<TBody>(projectId: string, id: string, subPath: string) {
      const invalidate = useInvalidateProject(projectId);
      return useMutation({
        mutationFn: (payload: TBody) =>
          apiClient.put<TDetail>(`${path(projectId)}/${id}/${subPath}`, payload),
        onSuccess: invalidate,
      });
    },
  };
}
