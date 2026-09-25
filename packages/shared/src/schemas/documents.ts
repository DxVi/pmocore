import { z } from 'zod';
import {
  RecordMetaSchema,
  RecordRefSchema,
  TEXT_LONG,
  TEXT_MEDIUM,
  listQuery,
  optionalDate,
  optionalHttpUrl,
  optionalRecordId,
  optionalReferenceId,
  optionalText,
  queryReferenceId,
  requiredText,
  version,
} from './common.js';

const documentFields = {
  phaseId: optionalReferenceId,
  documentTypeId: optionalReferenceId,
  title: requiredText(),
  docVersion: optionalText(100),
  ownerName: optionalText(TEXT_MEDIUM),
  documentDate: optionalDate,
  statusId: optionalReferenceId,
  linkUrl: optionalHttpUrl,
  relatedRequirementId: optionalRecordId,
  relatedActivityId: optionalRecordId,
  relatedReleaseId: optionalRecordId,
  relatedWorkItemId: optionalRecordId,
  remarks: optionalText(TEXT_LONG),
};

type RelatedFields = {
  relatedRequirementId: string | null;
  relatedActivityId: string | null;
  relatedReleaseId: string | null;
  relatedWorkItemId: string | null;
};

const singleRelated = (value: RelatedFields, ctx: z.RefinementCtx) => {
  const set = [
    value.relatedRequirementId,
    value.relatedActivityId,
    value.relatedReleaseId,
    value.relatedWorkItemId,
  ].filter(Boolean);
  if (set.length > 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['relatedRequirementId'],
      message: 'Choose at most one related record',
    });
  }
};

export const DocumentCreateSchema = z.object(documentFields).superRefine(singleRelated);
export const DocumentUpdateSchema = z
  .object({ ...documentFields, version })
  .superRefine(singleRelated);

export const DOCUMENT_SORT_FIELDS = ['code', 'title', 'documentDate', 'updatedAt'] as const;

export const DocumentListQuerySchema = listQuery(DOCUMENT_SORT_FIELDS, 'updatedAt').extend({
  phaseId: queryReferenceId,
  documentTypeId: queryReferenceId,
  statusId: queryReferenceId,
});

export const DocumentSchema = RecordMetaSchema.extend({
  phaseId: z.number().int().nullable(),
  documentTypeId: z.number().int().nullable(),
  title: z.string(),
  docVersion: z.string().nullable(),
  ownerName: z.string().nullable(),
  documentDate: z.string().nullable(),
  statusId: z.number().int().nullable(),
  linkUrl: z.string().nullable(),
  relatedRequirementId: z.uuid().nullable(),
  relatedActivityId: z.uuid().nullable(),
  relatedReleaseId: z.uuid().nullable(),
  relatedWorkItemId: z.uuid().nullable(),
  remarks: z.string().nullable(),
});

export const DocumentDetailSchema = DocumentSchema.extend({
  relatedRecord: RecordRefSchema.extend({
    type: z.enum(['requirement', 'activity', 'release', 'workItem']),
  }).nullable(),
  attachmentCount: z.number().int(),
});

export type DocumentCreateInput = z.input<typeof DocumentCreateSchema>;
export type DocumentCreate = z.infer<typeof DocumentCreateSchema>;
export type DocumentUpdate = z.infer<typeof DocumentUpdateSchema>;
export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;
export type ProjectDocument = z.infer<typeof DocumentSchema>;
export type DocumentDetail = z.infer<typeof DocumentDetailSchema>;
