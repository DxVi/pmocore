import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse, ProjectMetrics } from '@pmocore/shared';
import { apiClient } from '@/lib/api-client';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get<DashboardResponse>('/dashboard'),
  });
}

/**
 * Keyed under the project's overview so every module that refreshes the
 * overview after a change also refreshes these derived metrics.
 */
export function useProjectMetrics(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'overview', 'metrics'],
    queryFn: () => apiClient.get<ProjectMetrics>(`/projects/${projectId}/metrics`),
  });
}
