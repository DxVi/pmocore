import {
  ATTACHMENT_ALLOWED_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MESSAGES,
} from '@pmocore/shared';

/**
 * Client-side pre-checks (design §10.2) give immediate feedback before any
 * bytes are sent. The server repeats every check and remains authoritative.
 */
const EXTENSION_FOR_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export function fileExtension(name: string): string {
  return /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
}

/**
 * Some mobile browsers name camera captures without an extension; derive one
 * from the reported type so the server's extension + signature check can run.
 */
export function uploadName(file: File): string {
  if (fileExtension(file.name)) return file.name;
  const extension = EXTENSION_FOR_TYPE[file.type];
  const stem = file.name || 'photo';
  return extension ? `${stem}.${extension}` : stem;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/** Returns a user-facing rejection message, or null when the file may be uploaded. */
export function precheckFile(file: File): string | null {
  const extension = fileExtension(uploadName(file));
  if (extension === 'heic' || extension === 'heif' || /hei[cf]/i.test(file.type)) {
    return ATTACHMENT_MESSAGES.heic;
  }
  if (!ATTACHMENT_ALLOWED_EXTENSIONS.includes(extension)) return ATTACHMENT_MESSAGES.unsupported;
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return ATTACHMENT_MESSAGES.tooLarge((file.size / 1_048_576).toFixed(1));
  }
  return null;
}
