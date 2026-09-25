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
  queryBoolean,
  queryReferenceId,
  requiredText,
  version,
} from './common.js';

const requirementFields = {
  module: optionalText(TEXT_MEDIUM),
  dateRaised: optionalDate,
  source: optionalText(TEXT_MEDIUM),
  statement: requiredText(TEXT_LONG),
  acceptanceCriteria: optionalText(TEXT_LONG),
  requirementTypeId: optionalReferenceId,
  priorityId: optionalReferenceId,
  assigneeName: optionalText(TEXT_MEDIUM),
  statusId: optionalReferenceId,
  targetReleaseId: optionalRecordId,
  isChangeRequest: z.boolean().default(false),
  changeRequestRaidId: optionalRecordId,
  validationEvidence: optionalText(TEXT_LONG),
  remarks: optionalText(TEXT_LONG),
};

export const RequirementCreateSchema = z.object(requirementFields);
export const RequirementUpdateSchema = z.object({ ...requirementFields, version });

export const REQUIREMENT_SORT_FIELDS = ['code', 'dateRaised', 'priority', 'updatedAt'] as const;

export const RequirementListQuerySchema = listQuery(REQUIREMENT_SORT_FIELDS, 'updatedAt').extend({
  statusId: queryReferenceId,
  priorityId: queryReferenceId,
  requirementTypeId: queryReferenceId,
  targetReleaseId: z.uuid().optional(),
  open: queryBoolean,
  changeRequest: queryBoolean,
});

export const RequirementSchema = RecordMetaSchema.extend({
  module: z.string().nullable(),
  dateRaised: z.string().nullable(),
  source: z.string().nullable(),
  statement: z.string(),
  acceptanceCriteria: z.string().nullable(),
  requirementTypeId: z.number().int().nullable(),
  priorityId: z.number().int().nullable(),
  assigneeName: z.string().nullable(),
  statusId: z.number().int().nullable(),
  targetReleaseId: z.uuid().nullable(),
  isChangeRequest: z.boolean(),
  changeRequestRaidId: z.uuid().nullable(),
  validationEvidence: z.string().nullable(),
  remarks: z.string().nullable(),
});

/** Trace view (design §11.2): requirement → work items → tests → defects → releases → acceptance. */
export const RequirementDetailSchema = RequirementSchema.extend({
  workItems: z.array(RecordRefSchema),
  tests: z.array(RecordRefSchema.extend({ resultId: z.number().int().nullable() })),
  defects: z.array(
    RecordRefSchema.extend({
      testCaseId: z.uuid().nullable(),
      statusId: z.number().int().nullable(),
      retestResultId: z.number().int().nullable(),
    }),
  ),
  targetRelease: RecordRefSchema.nullable(),
  releasedIn: z.array(
    RecordRefSchema.extend({
      note: z.string().nullable(),
      acceptanceStatusId: z.number().int().nullable(),
    }),
  ),
});

export type RequirementCreateInput = z.input<typeof RequirementCreateSchema>;
export type RequirementCreate = z.infer<typeof RequirementCreateSchema>;
export type RequirementUpdate = z.infer<typeof RequirementUpdateSchema>;
export type RequirementListQuery = z.infer<typeof RequirementListQuerySchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type RequirementDetail = z.infer<typeof RequirementDetailSchema>;
