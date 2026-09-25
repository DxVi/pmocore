import { z } from 'zod';

/**
 * Field builders shared by every module contract.
 *
 * Update payloads carry the full editable field set (PUT semantics): omitted
 * optional fields are normalized to `null`. Empty strings from forms are also
 * normalized to `null` so "cleared" and "never set" are stored identically.
 */
export const TEXT_SHORT = 200;
export const TEXT_MEDIUM = 1000;
export const TEXT_LONG = 20_000;

const emptyToNull = <T>(value: T | '' | null | undefined): T | null =>
  value === '' || value === undefined ? null : value;

export const requiredText = (max: number = TEXT_SHORT) =>
  z.string().trim().min(1, 'Required').max(max);

export const optionalText = (max: number = TEXT_LONG) =>
  z.string().trim().max(max).nullish().transform(emptyToNull);

export const businessDate = z.iso.date();
export const optionalDate = z
  .union([z.iso.date(), z.literal('')])
  .nullish()
  .transform(emptyToNull);
export const optionalTime = z
  .union([z.iso.time({ precision: -1 }), z.iso.time(), z.literal('')])
  .nullish()
  .transform(emptyToNull);

export const referenceId = z.number().int().positive();
export const optionalReferenceId = referenceId.nullish().transform((v) => v ?? null);

export const recordId = z.uuid();
export const optionalRecordId = z
  .union([z.uuid(), z.literal('')])
  .nullish()
  .transform(emptyToNull);

export const version = z.number().int().positive();

export const optionalHttpUrl = z
  .union([z.url({ protocol: /^https?$/ }).max(TEXT_MEDIUM), z.literal('')])
  .nullish()
  .transform(emptyToNull);

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

const queryBoolean = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const queryReferenceId = z.coerce.number().int().positive().optional();

/** Base list query for every operational listing (REQ-062/063). */
export const ListQueryBaseSchema = z.object({
  q: z.string().trim().max(TEXT_SHORT).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  dir: z.enum(SORT_DIRECTIONS).default('desc'),
});

export const listQuery = <S extends readonly [string, ...string[]]>(
  sortFields: S,
  defaultSort: S[number],
) => ListQueryBaseSchema.extend({ sort: z.enum(sortFields).default(defaultSort) });

export { queryBoolean };

/** Audit and identity fields present on every project-scoped record DTO. */
export const RecordMetaSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  code: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  createdBy: z.uuid(),
  updatedAt: z.iso.datetime({ offset: true }),
  updatedBy: z.uuid(),
  version: z.number().int(),
});

/** Compact reference to another record, used in relationship summaries. */
export const RecordRefSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  title: z.string(),
});

export type RecordMeta = z.infer<typeof RecordMetaSchema>;
export type RecordRef = z.infer<typeof RecordRefSchema>;
export type ListQueryBase = z.infer<typeof ListQueryBaseSchema>;
