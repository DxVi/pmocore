/** The metadata row exists but the stored object does not (e.g. lost or purged). */
export class StorageObjectNotFoundError extends Error {
  constructor() {
    super('Stored attachment object not found');
    this.name = 'StorageObjectNotFoundError';
  }
}
