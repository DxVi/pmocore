import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityCreate,
  ActivityDetail,
  ActivityListItem,
  ActivityListQuery,
  ActivityUpdate,
  FollowUpActionsRequest,
  RaidItem,
} from '@pmocore/shared';
import { apiClient, toQueryString } from '@/lib/api-client';

export const activityKeys = {
  all: (projectId: string) => ['projects', projectId, 'activities'] as const,
  list: (projectId: string, params: Partial<ActivityListQuery>) =>
    ['projects', projectId, 'activities', 'list', params] as const,
  detail: (projectId: string, id: string) => ['projects', projectId, 'activities', id] as const,
};

const path = (projectId: string) => `/projects/${projectId}/activities`;

export function useActivities(projectId: string, params: Partial<ActivityListQuery>) {
  return useQuery({
    queryKey: activityKeys.list(projectId, params),
    queryFn: () => apiClient.list<ActivityListItem>(`${path(projectId)}${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useActivity(projectId: string, id: string) {
  return useQuery({
    queryKey: activityKeys.detail(projectId, id),
    queryFn: () => apiClient.get<ActivityDetail>(`${path(projectId)}/${id}`),
  });
}

function useInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: activityKeys.all(projectId) });
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'raid-items'] });
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'overview'] });
  };
}

export function useCreateActivity(projectId: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (input: ActivityCreate) => apiClient.post<ActivityDetail>(path(projectId), input),
    onSuccess: invalidate,
  });
}

export function useUpdateActivity(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (input: ActivityUpdate) =>
      apiClient.put<ActivityDetail>(`${path(projectId)}/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteActivity(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: () => apiClient.delete(`${path(projectId)}/${id}`),
    onSuccess: invalidate,
  });
}

export function useAddFollowUps(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId);
  return useMutation({
    mutationFn: (request: FollowUpActionsRequest) =>
      apiClient.post<RaidItem[]>(`${path(projectId)}/${id}/actions`, request),
    onSuccess: invalidate,
  });
}
