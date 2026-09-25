import { ATTACHMENT_FILE_TYPES, type AttachmentFileType } from '@pmocore/shared';

/**
 * Upload type validation (design §10.1). The file's extension AND its content
 * signature must match the same allowlisted type; the stored content type is
 * always the canonical one from the allowlist, never the client's claim.
 */
export type FileCheck =
  | { ok: true; type: AttachmentFileType; extension: string }
  | { ok: false; reason: 'empty' | 'heic' | 'unsupported' | 'mismatch' };

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

const ascii = (buffer: Buffer, start: number, end: number) =>
  buffer.subarray(start, end).toString('latin1');

type Signature = 'pdf' | 'png' | 'jpeg' | 'webp' | 'zip' | 'ole' | 'heic' | 'unknown';

export function detectSignature(buffer: Buffer): Signature {
  if (buffer.subarray(0, 1024).includes('%PDF-')) return 'pdf';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') return 'webp';
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole';
  if (
    ascii(buffer, 4, 8) === 'ftyp' &&
    /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|heif)$/.test(ascii(buffer, 8, 12))
  ) {
    return 'heic';
  }
  return 'unknown';
}

const SIGNATURE_BY_EXTENSION: Record<string, Signature> = {
  pdf: 'pdf',
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  webp: 'webp',
  docx: 'zip',
  xlsx: 'zip',
  doc: 'ole',
  xls: 'ole',
};

export function fileExtension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match?.[1]?.toLowerCase() ?? '';
}

export function checkFile(originalName: string, buffer: Buffer): FileCheck {
  if (buffer.length === 0) return { ok: false, reason: 'empty' };
  const extension = fileExtension(originalName);
  const signature = detectSignature(buffer);

  if (signature === 'heic' || extension === 'heic' || extension === 'heif') {
    return { ok: false, reason: 'heic' };
  }
  const type = ATTACHMENT_FILE_TYPES.find((t) => t.extensions.includes(extension));
  if (!type) return { ok: false, reason: 'unsupported' };
  if (SIGNATURE_BY_EXTENSION[extension] !== signature) return { ok: false, reason: 'mismatch' };

  // Office Open XML packages are ZIP files; confirm the package part matches the extension.
  if (extension === 'docx' && !buffer.includes('word/')) return { ok: false, reason: 'mismatch' };
  if (extension === 'xlsx' && !buffer.includes('xl/')) return { ok: false, reason: 'mismatch' };

  return { ok: true, type, extension };
}

/**
 * Display-only file name: no path segments, control or reserved characters,
 * NFC-normalized, at most 200 characters with the extension preserved. It is
 * never used to build a storage path (REQ-042).
 */
export function sanitizeFileName(originalName: string, extension: string): string {
  const base = originalName.split(/[\\/]/).pop() ?? '';
  const name = base
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const suffix = `.${extension}`;
  const stem = (name.toLowerCase().endsWith(suffix) ? name.slice(0, -suffix.length) : name)
    .replace(/^\.+/, '')
    .trim();
  if (!stem) return `attachment${suffix}`;
  return `${stem.slice(0, 200 - suffix.length)}${suffix}`;
}
