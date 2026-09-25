import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { checkFile, sanitizeFileName } from '../file-policy.js';
import { StorageObjectNotFoundError } from '../storage/errors.js';
import { LocalFsStorage } from '../storage/local-fs-storage.js';
import { S3Storage } from '../storage/s3-storage.js';
import { buildStorageKey } from '../storage/storage.js';
import { FIXTURES } from './fixtures.js';

const KEY = buildStorageKey(
  '6f1c3b8e-2d4a-4b8f-9c1e-3a5b7d9f1e2a',
  '7a2d4c9f-3e5b-4c9a-8d2f-4b6c8e0a2f3b',
);

describe('attachment file policy (design §10.1)', () => {
  it.each([
    ['report.pdf', FIXTURES.pdf, 'application/pdf'],
    ['photo.PNG', FIXTURES.png, 'image/png'],
    ['camera.jpg', FIXTURES.jpg, 'image/jpeg'],
    ['camera.jpeg', FIXTURES.jpg, 'image/jpeg'],
    ['image.webp', FIXTURES.webp, 'image/webp'],
    [
      'minutes.docx',
      FIXTURES.docx,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    [
      'tracker.xlsx',
      FIXTURES.xlsx,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    ['legacy.doc', FIXTURES.ole, 'application/msword'],
    ['legacy.xls', FIXTURES.ole, 'application/vnd.ms-excel'],
  ])('accepts %s as %s', (name, buffer, contentType) => {
    const result = checkFile(name, buffer);
    expect(result.ok && result.type.contentType).toBe(contentType);
  });

  it('rejects HEIC by content or extension, unsupported types, mismatches and empty files', () => {
    expect(checkFile('IMG_0001.HEIC', FIXTURES.heic)).toEqual({ ok: false, reason: 'heic' });
    expect(checkFile('IMG_0001.jpg', FIXTURES.heic)).toEqual({ ok: false, reason: 'heic' });
    expect(checkFile('setup.exe', FIXTURES.zip)).toEqual({ ok: false, reason: 'unsupported' });
    expect(checkFile('archive.zip', FIXTURES.zip)).toEqual({ ok: false, reason: 'unsupported' });
    expect(checkFile('fake.pdf', FIXTURES.png)).toEqual({ ok: false, reason: 'mismatch' });
    expect(checkFile('fake.docx', FIXTURES.xlsx)).toEqual({ ok: false, reason: 'mismatch' });
    expect(checkFile('fake.xlsx', FIXTURES.zip)).toEqual({ ok: false, reason: 'mismatch' });
    expect(checkFile('noextension', FIXTURES.pdf)).toEqual({ ok: false, reason: 'unsupported' });
    expect(checkFile('empty.pdf', Buffer.alloc(0))).toEqual({ ok: false, reason: 'empty' });
  });

  it('sanitizes display names without ever deriving paths from them', () => {
    expect(sanitizeFileName('../../etc/passwd.pdf', 'pdf')).toBe('passwd.pdf');
    expect(sanitizeFileName('C:\\Users\\me\\Site "visit"<1>.jpg', 'jpg')).toBe('Site visit1.jpg');
    expect(sanitizeFileName('\u0000\u0007.pdf', 'pdf')).toBe('attachment.pdf');
    expect(sanitizeFileName('Café minutes.docx', 'docx')).toBe('Café minutes.docx');
    const long = sanitizeFileName(`${'x'.repeat(300)}.pdf`, 'pdf');
    expect(long).toHaveLength(200);
    expect(long.endsWith('.pdf')).toBe(true);
  });
});

describe('local filesystem storage', () => {
  const root = mkdtempSync(join(tmpdir(), 'pmocore-storage-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('stores, reads, lists and idempotently deletes objects', async () => {
    const storage = new LocalFsStorage(root);
    await storage.put(KEY, FIXTURES.pdf);
    expect(await text(await storage.openRead(KEY))).toBe(FIXTURES.pdf.toString());

    const keys: string[] = [];
    for await (const key of storage.list('')) keys.push(key);
    expect(keys).toEqual([KEY]);

    await storage.delete(KEY);
    await storage.delete(KEY);
    await expect(storage.openRead(KEY)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });

  it('rejects keys that are not server-generated', async () => {
    const storage = new LocalFsStorage(root);
    await expect(storage.put('../escape', FIXTURES.pdf)).rejects.toThrow(
      /Invalid attachment storage key/,
    );
    await expect(storage.openRead('a/../../b')).rejects.toThrow(/Invalid attachment storage key/);
  });
});

describe('S3-compatible storage (in-process fake client, no network)', () => {
  it('issues private put/get/delete commands against the configured bucket', async () => {
    const send = vi.fn((command: unknown) => {
      if (command instanceof GetObjectCommand) {
        return Promise.resolve({ Body: Readable.from([FIXTURES.pdf]) });
      }
      return Promise.resolve({});
    });
    const storage = new S3Storage({ send }, 'pmocore-attachments');

    await storage.put(KEY, FIXTURES.pdf, 'application/pdf');
    const put = send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input).toMatchObject({
      Bucket: 'pmocore-attachments',
      Key: KEY,
      ContentType: 'application/pdf',
      ContentLength: FIXTURES.pdf.length,
    });
    expect(put.input).not.toHaveProperty('ACL');

    expect(await text(await storage.openRead(KEY))).toBe(FIXTURES.pdf.toString());

    await storage.delete(KEY);
    expect(send.mock.calls[2]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it('maps a missing object to StorageObjectNotFoundError', async () => {
    const send = vi.fn(() =>
      Promise.reject(Object.assign(new Error('missing'), { name: 'NoSuchKey' })),
    );
    const storage = new S3Storage({ send }, 'bucket');
    await expect(storage.openRead(KEY)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });
});
