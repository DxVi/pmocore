import { useQuery } from '@tanstack/react-query';
import type { Attachment, AttachmentCaptureSource, AttachmentParentType } from '@pmocore/shared';
import { apiClient, toQueryString } from '@/lib/api-client';
import { uploadName } from './file-checks';

export const attachmentKeys = {
  list: (projectId: string, parentType: AttachmentParentType, parentId: string) =>
    ['projects', projectId, 'attachments', parentType, parentId] as const,
};

/**
 * Query-key prefix of each parent module, refreshed after attachment changes so
 * counts and "last activity" stay current. Modules key their data under
 * ['projects', projectId, <module>, ...].
 */
export const PARENT_MODULE_KEY: Record<AttachmentParentType, string> = {
  activity: 'activities',
  document: 'documents',
};

export function useAttachments(
  projectId: string,
  parentType: AttachmentParentType,
  parentId: string,
) {
  return useQuery({
    queryKey: attachmentKeys.list(projectId, parentType, parentId),
    queryFn: () =>
      apiClient.get<Attachment[]>(
        `/projects/${projectId}/attachments${toQueryString({ parentType, parentId })}`,
      ),
  });
}

export function uploadAttachment(
  projectId: string,
  parentType: AttachmentParentType,
  parentId: string,
  file: File,
  captureSource: AttachmentCaptureSource,
) {
  const form = new FormData();
  form.append('parentType', parentType);
  form.append('parentId', parentId);
  form.append('captureSource', captureSource);
  form.append('file', file, uploadName(file));
  return apiClient.upload<Attachment>(`/projects/${projectId}/attachments`, form);
}

export function removeAttachment(projectId: string, attachmentId: string) {
  return apiClient.delete<{ deleted: true }>(`/projects/${projectId}/attachments/${attachmentId}`);
}
