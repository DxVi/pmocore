import { randomBytes } from 'node:crypto';
import { accessSync, constants, createReadStream, mkdirSync } from 'node:fs';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { assertStorageKey, type AttachmentStorage } from './storage.js';
import { StorageObjectNotFoundError } from './errors.js';

/**
 * Filesystem driver for development and automated tests (design §10.5).
 * Paths are derived only from validated server-generated keys and must stay
 * inside the configured root.
 */
export class LocalFsStorage implements AttachmentStorage {
  readonly driver = 'local' as const;
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = resolve(rootDir);
    // Fail fast at startup when the directory cannot be created or written.
    mkdirSync(this.root, { recursive: true });
    accessSync(this.root, constants.W_OK);
  }

  private pathFor(key: string): string {
    assertStorageKey(key);
    const path = resolve(this.root, ...key.split('/'));
    if (!path.startsWith(this.root + sep)) throw new Error('Storage path escapes the root');
    return path;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    // Write then rename so readers never see a partial file.
    const temp = `${path}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      await writeFile(temp, data, { flag: 'wx' });
      await rename(temp, path);
    } catch (err) {
      await rm(temp, { force: true });
      throw err;
    }
  }

  async openRead(key: string): Promise<Readable> {
    const path = this.pathFor(key);
    try {
      await stat(path);
    } catch {
      throw new StorageObjectNotFoundError();
    }
    return createReadStream(path);
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  async *list(prefix = ''): AsyncIterable<string> {
    let projects: string[];
    try {
      projects = await readdir(this.root);
    } catch {
      return;
    }
    for (const project of projects) {
      const files = await readdir(join(this.root, project)).catch(() => [] as string[]);
      for (const file of files) {
        if (file.endsWith('.tmp')) continue;
        const key = relative(this.root, join(this.root, project, file))
          .split(sep)
          .join('/');
        if (key.startsWith(prefix)) yield key;
      }
    }
  }
}
