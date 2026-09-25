import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_ALLOWED_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  DocumentCreateSchema,
  ListQueryBaseSchema,
  LoginRequestSchema,
  ProjectCreateSchema,
  ProjectListQuerySchema,
  ProjectUpdateSchema,
  RaidItemCreateSchema,
  WorkItemCreateSchema,
  formatRecordCode,
} from '../index.js';

describe('shared contracts', () => {
  it('normalizes project input: uppercase code, empty strings to null, missing optionals to null', () => {
    const parsed = ProjectCreateSchema.parse({
      code: ' basc-cqms ',
      name: ' CQMS ',
      summary: '',
      targetDate: '',
    });
    expect(parsed.code).toBe('BASC-CQMS');
    expect(parsed.name).toBe('CQMS');
    expect(parsed.summary).toBeNull();
    expect(parsed.targetDate).toBeNull();
    expect(parsed.phaseId).toBeNull();
  });

  it('rejects invalid project codes and requires a version on update', () => {
    expect(ProjectCreateSchema.safeParse({ code: 'has space', name: 'X' }).success).toBe(false);
    expect(ProjectCreateSchema.safeParse({ code: 'A', name: 'X' }).success).toBe(false);
    expect(ProjectUpdateSchema.safeParse({ name: 'X' }).success).toBe(false);
    expect(ProjectUpdateSchema.safeParse({ name: 'X', version: 1 }).success).toBe(true);
  });

  it('applies list defaults and caps page size', () => {
    const q = ProjectListQuerySchema.parse({});
    expect(q).toMatchObject({
      page: 1,
      pageSize: 25,
      dir: 'desc',
      sort: 'updatedAt',
      archived: 'active',
    });
    expect(ListQueryBaseSchema.safeParse({ pageSize: '500' }).success).toBe(false);
    expect(ProjectListQuerySchema.parse({ statusId: '3', page: '2' })).toMatchObject({
      statusId: 3,
      page: 2,
    });
  });

  it('validates date ordering and ranges', () => {
    expect(
      WorkItemCreateSchema.safeParse({
        title: 'T',
        plannedStart: '2026-10-10',
        plannedEnd: '2026-10-01',
      }).success,
    ).toBe(false);
    expect(WorkItemCreateSchema.safeParse({ title: 'T', percentComplete: 101 }).success).toBe(
      false,
    );
    expect(
      RaidItemCreateSchema.safeParse({
        typeId: 1,
        title: 'A',
        dateRaised: '2026-10-05',
        closedDate: '2026-10-01',
      }).success,
    ).toBe(false);
  });

  it('allows only http(s) document links and at most one related record', () => {
    expect(
      DocumentCreateSchema.safeParse({ title: 'D', linkUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(
      DocumentCreateSchema.safeParse({ title: 'D', linkUrl: 'https://example.com/x' }).success,
    ).toBe(true);
    expect(
      DocumentCreateSchema.safeParse({
        title: 'D',
        relatedRequirementId: '6f1c3b8e-2d4a-4b8f-9c1e-3a5b7d9f1e2a',
        relatedActivityId: '7a2d4c9f-3e5b-4c9a-8d2f-4b6c8e0a2f3b',
      }).success,
    ).toBe(false);
  });

  it('normalizes login email', () => {
    expect(LoginRequestSchema.parse({ email: ' PM@Example.COM ', password: 'x' }).email).toBe(
      'pm@example.com',
    );
  });

  it('keeps the approved attachment allowlist and limit', () => {
    expect(ATTACHMENT_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect([...ATTACHMENT_ALLOWED_EXTENSIONS].sort()).toEqual(
      ['doc', 'docx', 'jpeg', 'jpg', 'pdf', 'png', 'webp', 'xls', 'xlsx'].sort(),
    );
    expect(ATTACHMENT_ACCEPT.camera).not.toMatch(/heic/i);
  });

  it('formats record codes', () => {
    expect(formatRecordCode('REQ', 7)).toBe('REQ-007');
    expect(formatRecordCode('MV', 1234)).toBe('MV-1234');
  });
});
