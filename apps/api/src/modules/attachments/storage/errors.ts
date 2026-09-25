/** The metadata row exists but the stored object does not (e.g. lost or purged). */
export class StorageObjectNotFoundError extends Error {
  constructor() {
    super('Stored attachment object not found');
    this.name = 'StorageObjectNotFoundError';
  }
}

/** Storing the object would exceed the configured storage capacity (postgres driver). */
export class StorageQuotaExceededError extends Error {
  constructor() {
    super('Attachment storage quota exceeded');
    this.name = 'StorageQuotaExceededError';
  }
}
