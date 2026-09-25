import { pool } from '@pmocore/database';
import { env } from '../../../config/env.js';
import { LocalFsStorage } from './local-fs-storage.js';
import { PostgresStorage } from './postgres-storage.js';
import { S3Storage } from './s3-storage.js';
import type { AttachmentStorage } from './storage.js';

let storage: AttachmentStorage | undefined;

function createStorage(): AttachmentStorage {
  if (env.ATTACHMENT_STORAGE_DRIVER === 's3') {
    // Presence of these values is enforced by the environment schema when driver=s3.
    return S3Storage.fromConfig({
      endpoint: env.S3_ENDPOINT ?? '',
      region: env.S3_REGION,
      bucket: env.S3_BUCKET ?? '',
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }
  if (env.ATTACHMENT_STORAGE_DRIVER === 'postgres') {
    return new PostgresStorage(pool, { quotaBytes: env.ATTACHMENT_DB_QUOTA_MB * 1_048_576 });
  }
  return new LocalFsStorage(env.ATTACHMENT_STORAGE_DIR);
}

/** The configured storage driver (created on first use; local storage validates its directory). */
export function getAttachmentStorage(): AttachmentStorage {
  storage ??= createStorage();
  return storage;
}

/** Test seam: replace the storage driver (e.g. with a failing fake). */
export function setAttachmentStorage(next: AttachmentStorage | undefined): void {
  storage = next;
}
