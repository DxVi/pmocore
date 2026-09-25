import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  RaidItem,
  RaidItemCreate,
  RaidItemDetail,
  RaidItemListQuery,
  RaidItemUpdate,
} from '@pmocore/shared';
import { apiClient, toQueryString } from '@/lib/api-client';

export const raidKeys = {
  all: (projectId: string) => ['projects', projectId, 'raid-items'] as const,
  list: (projectId: string, params: Partial<RaidItemListQuery>) =>
    ['projects', projectId, 'raid-items', 'list', params] as const,
  detail: (projectId: string, id: string) => ['projects', projectId, 'raid-items', id] as const,
};

const path = (projectId: string) => `/projects/${projectId}/raid-items`;

export function useRaidItems(projectId: string, params: Partial<RaidItemListQuery>) {
  return useQuery({
    queryKey: raidKeys.list(projectId, params),
    queryFn: () => apiClient.list<RaidItem>(`${path(projectId)}${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useRaidItem(projectId: string, id: string) {
  return useQuery({
    queryKey: raidKeys.detail(projectId, id),
    queryFn: () => apiClient.get<RaidItemDetail>(`${path(projectId)}/${id}`),
  });
}

function useInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: raidKeys.all(projectId) });
    // Follow-up lists and open-action counts on meetings depend on RAID items.
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'activities'] });
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'overview'] });
  };
}

export function useCreateRaidItem(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (input: RaidItemCreate) => apiClient.post<RaidItemDetail>(path(projectId), input),
    onSuccess: invalidate,
  });
}

export function useUpdateRaidItem(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (input: RaidItemUpdate) =>
      apiClient.put<RaidItemDetail>(`${path(projectId)}/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteRaidItem(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: () => apiClient.delete(`${path(projectId)}/${id}`),
    onSuccess: invalidate,
  });
}
