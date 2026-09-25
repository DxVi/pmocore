import { useMutation } from '@tanstack/react-query';
import type {
  Acceptance,
  AcceptanceCreate,
  AcceptanceUpdate,
  Release,
  ReleaseCreate,
  ReleaseDetail,
  ReleaseUpdate,
} from '@pmocore/shared';
import { apiClient } from '@/lib/api-client';
import { createRecordApi, useInvalidateProject } from '@/features/plan/common/record-api';

export const releasesApi = createRecordApi<Release, ReleaseDetail, ReleaseCreate, ReleaseUpdate>(
  'releases',
);

export function useCreateAcceptance(projectId: string, releaseId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (input: AcceptanceCreate) =>
      apiClient.post<Acceptance>(`/projects/${projectId}/releases/${releaseId}/acceptances`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateAcceptance(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AcceptanceUpdate }) =>
      apiClient.put<Acceptance>(`/projects/${projectId}/acceptances/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAcceptance(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/projects/${projectId}/acceptances/${id}`),
    onSuccess: invalidate,
  });
}
