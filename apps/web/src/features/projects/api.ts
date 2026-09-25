import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Project,
  ProjectCreate,
  ProjectListQuery,
  ProjectOverview,
  ProjectUpdate,
} from '@pmocore/shared';
import { apiClient, toQueryString } from '@/lib/api-client';

/** Query keys: every project-scoped module keys its data under ['projects', projectId, ...]. */
export const projectKeys = {
  all: ['projects'] as const,
  list: (params: Partial<ProjectListQuery>) => ['projects', 'list', params] as const,
  detail: (projectId: string) => ['projects', projectId, 'detail'] as const,
  overview: (projectId: string) => ['projects', projectId, 'overview'] as const,
};

export function useProjects(params: Partial<ProjectListQuery>) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => apiClient.list<Project>(`/projects${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => apiClient.get<Project>(`/projects/${projectId}`),
  });
}

export function useProjectOverview(projectId: string) {
  return useQuery({
    queryKey: projectKeys.overview(projectId),
    queryFn: () => apiClient.get<ProjectOverview>(`/projects/${projectId}/overview`),
  });
}

function useRefreshProject() {
  const queryClient = useQueryClient();
  return (project: Project) => {
    queryClient.setQueryData(projectKeys.detail(project.id), project);
    void queryClient.invalidateQueries({ queryKey: ['projects', 'list'] });
    void queryClient.invalidateQueries({ queryKey: projectKeys.overview(project.id) });
  };
}

export function useCreateProject() {
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: (input: ProjectCreate) => apiClient.post<Project>('/projects', input),
    onSuccess: refresh,
  });
}

export function useUpdateProject(projectId: string) {
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: (input: ProjectUpdate) => apiClient.put<Project>(`/projects/${projectId}`, input),
    onSuccess: refresh,
  });
}

export function useSetProjectArchived(projectId: string) {
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: (archived: boolean) =>
      apiClient.post<Project>(`/projects/${projectId}/${archived ? 'archive' : 'unarchive'}`),
    onSuccess: refresh,
  });
}
