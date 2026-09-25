import { z } from 'zod';

/**
 * Attachment contract (design §10). Frozen by PKG-1; implemented by PKG-2.
 * The allowlist and size limit are approved values and must not be expanded
 * without Project Leadership approval.
 */
export const ATTACHMENT_MAX_BYTES = 10_485_760; // 10 MB

export const ATTACHMENT_PARENT_TYPES = ['activity', 'document'] as const;
export type AttachmentParentType = (typeof ATTACHMENT_PARENT_TYPES)[number];

export const ATTACHMENT_CAPTURE_SOURCES = ['camera', 'gallery', 'file'] as const;
export type AttachmentCaptureSource = (typeof ATTACHMENT_CAPTURE_SOURCES)[number];

export type AttachmentFileType = {
  extensions: readonly string[];
  contentType: string;
  /** `inline` types open in the browser; others download. */
  disposition: 'inline' | 'attachment';
};

export const ATTACHMENT_FILE_TYPES: readonly AttachmentFileType[] = [
  { extensions: ['pdf'], contentType: 'application/pdf', disposition: 'inline' },
  { extensions: ['png'], contentType: 'image/png', disposition: 'inline' },
  { extensions: ['jpg', 'jpeg'], contentType: 'image/jpeg', disposition: 'inline' },
  { extensions: ['webp'], contentType: 'image/webp', disposition: 'inline' },
  {
    extensions: ['docx'],
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    disposition: 'attachment',
  },
  {
    extensions: ['xlsx'],
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    disposition: 'attachment',
  },
  { extensions: ['doc'], contentType: 'application/msword', disposition: 'attachment' },
  { extensions: ['xls'], contentType: 'application/vnd.ms-excel', disposition: 'attachment' },
];

export const ATTACHMENT_ALLOWED_EXTENSIONS = ATTACHMENT_FILE_TYPES.flatMap((t) => t.extensions);

/** `accept` attribute values for the three capture inputs (design §10.2). */
export const ATTACHMENT_ACCEPT = {
  camera: 'image/jpeg,image/png,image/webp',
  gallery: 'image/jpeg,image/png,image/webp',
  files: ATTACHMENT_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(','),
} as const;

export const ATTACHMENT_MESSAGES = {
  heic: "HEIC photos aren't supported yet. Use Take photo or Photos (which send JPEG), or set iPhone Settings → Camera → Formats → Most Compatible.",
  unsupported:
    'This file type is not supported. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG/JPEG, WEBP.',
  tooLarge: (sizeMb: string) =>
    `This file is ${sizeMb} MB; the limit is 10 MB. For photos, switch the camera to standard resolution or use a smaller image.`,
} as const;

/** Multipart form fields accompanying the single `file` part of an upload. */
export const AttachmentUploadFieldsSchema = z.object({
  parentType: z.enum(ATTACHMENT_PARENT_TYPES),
  parentId: z.uuid(),
  captureSource: z.enum(ATTACHMENT_CAPTURE_SOURCES).optional(),
});

export const AttachmentListQuerySchema = z.object({
  parentType: z.enum(ATTACHMENT_PARENT_TYPES),
  parentId: z.uuid(),
});

export const AttachmentSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  parentType: z.enum(ATTACHMENT_PARENT_TYPES),
  parentId: z.uuid(),
  originalName: z.string(),
  contentType: z.string(),
  extension: z.string(),
  sizeBytes: z.number().int(),
  captureSource: z.enum(ATTACHMENT_CAPTURE_SOURCES).nullable(),
  uploadedBy: z.uuid(),
  uploadedByName: z.string(),
  uploadedAt: z.string(),
  /** Relative API path for viewing (inline where allowed) or downloading with `?download=1`. */
  contentUrl: z.string(),
});

export type AttachmentUploadFields = z.infer<typeof AttachmentUploadFieldsSchema>;
export type AttachmentListQuery = z.infer<typeof AttachmentListQuerySchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
