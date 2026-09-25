import { z } from 'zod';
import {
  RecordMetaSchema,
  RecordRefSchema,
  TEXT_LONG,
  TEXT_MEDIUM,
  listQuery,
  optionalDate,
  optionalRecordId,
  optionalReferenceId,
  optionalText,
  queryReferenceId,
  recordId,
  requiredText,
  version,
} from './common.js';

const releaseFields = {
  versionLabel: requiredText(100),
  name: optionalText(TEXT_MEDIUM),
  plannedDate: optionalDate,
  releaseDate: optionalDate,
  environmentId: optionalReferenceId,
  scope: optionalText(TEXT_LONG),
  deploymentStatusId: optionalReferenceId,
  demoDate: optionalDate,
  uatDate: optionalDate,
  uatResultId: optionalReferenceId,
  deliveryDate: optionalDate,
  trainingDate: optionalDate,
  remarks: optionalText(TEXT_LONG),
};

export const ReleaseCreateSchema = z.object(releaseFields);
export const ReleaseUpdateSchema = z.object({ ...releaseFields, version });

export const RELEASE_SORT_FIELDS = ['code', 'versionLabel', 'releaseDate', 'updatedAt'] as const;

export const ReleaseListQuerySchema = listQuery(RELEASE_SORT_FIELDS, 'releaseDate').extend({
  environmentId: queryReferenceId,
  deploymentStatusId: queryReferenceId,
});

/** Replace the release scope (history of inclusion, design §11.2 / DS-05). */
export const ReleaseRequirementsScopeSchema = z.object({
  items: z.array(z.object({ requirementId: recordId, note: optionalText(TEXT_MEDIUM) })).max(500),
});

export const ReleaseDefectsScopeSchema = z.object({
  items: z.array(z.object({ defectId: recordId, note: optionalText(TEXT_MEDIUM) })).max(500),
});

const acceptanceFields = {
  statusId: optionalReferenceId,
  acceptanceDate: optionalDate,
  acceptedBy: optionalText(TEXT_MEDIUM),
  certificateRef: optionalText(TEXT_MEDIUM),
  certificateDocumentId: optionalRecordId,
  handoverNotes: optionalText(TEXT_LONG),
  remarks: optionalText(TEXT_LONG),
};

export const AcceptanceCreateSchema = z.object(acceptanceFields);
export const AcceptanceUpdateSchema = z.object({ ...acceptanceFields, version });

export const ReleaseSchema = RecordMetaSchema.extend({
  versionLabel: z.string(),
  name: z.string().nullable(),
  plannedDate: z.string().nullable(),
  releaseDate: z.string().nullable(),
  environmentId: z.number().int().nullable(),
  scope: z.string().nullable(),
  deploymentStatusId: z.number().int().nullable(),
  demoDate: z.string().nullable(),
  uatDate: z.string().nullable(),
  uatResultId: z.number().int().nullable(),
  deliveryDate: z.string().nullable(),
  trainingDate: z.string().nullable(),
  remarks: z.string().nullable(),
});

export const AcceptanceSchema = RecordMetaSchema.extend({
  releaseId: z.uuid(),
  statusId: z.number().int().nullable(),
  acceptanceDate: z.string().nullable(),
  acceptedBy: z.string().nullable(),
  certificateRef: z.string().nullable(),
  certificateDocumentId: z.uuid().nullable(),
  handoverNotes: z.string().nullable(),
  remarks: z.string().nullable(),
});

export const ReleaseDetailSchema = ReleaseSchema.extend({
  includedRequirements: z.array(RecordRefSchema.extend({ note: z.string().nullable() })),
  includedDefects: z.array(RecordRefSchema.extend({ note: z.string().nullable() })),
  acceptances: z.array(AcceptanceSchema), // newest first; the first is the current acceptance
});

export type ReleaseCreateInput = z.input<typeof ReleaseCreateSchema>;
export type ReleaseCreate = z.infer<typeof ReleaseCreateSchema>;
export type ReleaseUpdate = z.infer<typeof ReleaseUpdateSchema>;
export type ReleaseListQuery = z.infer<typeof ReleaseListQuerySchema>;
export type Release = z.infer<typeof ReleaseSchema>;
export type ReleaseDetail = z.infer<typeof ReleaseDetailSchema>;
export type ReleaseRequirementsScope = z.infer<typeof ReleaseRequirementsScopeSchema>;
export type ReleaseDefectsScope = z.infer<typeof ReleaseDefectsScopeSchema>;
export type AcceptanceCreateInput = z.input<typeof AcceptanceCreateSchema>;
export type AcceptanceCreate = z.infer<typeof AcceptanceCreateSchema>;
export type AcceptanceUpdate = z.infer<typeof AcceptanceUpdateSchema>;
export type Acceptance = z.infer<typeof AcceptanceSchema>;
