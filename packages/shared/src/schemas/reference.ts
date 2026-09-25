import { z } from 'zod';

/** Reference categories (design §6.2). Seed values live in @pmocore/database. */
export const REFERENCE_CATEGORIES = [
  'PROJECT_PHASE',
  'STATUS',
  'PRIORITY',
  'ACTIVITY_TYPE',
  'RAID_TYPE',
  'TEST_RESULT',
  'ENVIRONMENT',
  'TEST_STAGE',
  'HEALTH',
  'REQUIREMENT_TYPE',
  'ACTIVITY_MODE',
  'PROBABILITY',
  'DOCUMENT_TYPE',
] as const;

export type ReferenceCategory = (typeof REFERENCE_CATEGORIES)[number];

/** Which category each taxonomy field is validated against. */
export const REFERENCE_FIELD_CATEGORIES = {
  phaseId: 'PROJECT_PHASE',
  statusId: 'STATUS',
  deploymentStatusId: 'STATUS',
  healthId: 'HEALTH',
  priorityId: 'PRIORITY',
  severityId: 'PRIORITY',
  activityTypeId: 'ACTIVITY_TYPE',
  modeId: 'ACTIVITY_MODE',
  typeId: 'RAID_TYPE',
  requirementTypeId: 'REQUIREMENT_TYPE',
  probabilityId: 'PROBABILITY',
  stageId: 'TEST_STAGE',
  resultId: 'TEST_RESULT',
  retestResultId: 'TEST_RESULT',
  uatResultId: 'TEST_RESULT',
  environmentId: 'ENVIRONMENT',
  documentTypeId: 'DOCUMENT_TYPE',
} as const satisfies Record<string, ReferenceCategory>;

/** Lifecycle semantics of STATUS values: INACTIVE = closed without completion (Deferred, Cancelled). */
export const LIFECYCLE_SEMANTICS = ['OPEN', 'DONE', 'INACTIVE'] as const;
export const HEALTH_SEMANTICS = ['GREEN', 'AMBER', 'RED', 'UNKNOWN'] as const;
export const TEST_RESULT_SEMANTICS = ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'RETEST'] as const;

export type LifecycleSemantic = (typeof LIFECYCLE_SEMANTICS)[number];
export type HealthSemantic = (typeof HEALTH_SEMANTICS)[number];
export type TestResultSemantic = (typeof TEST_RESULT_SEMANTICS)[number];

export const ReferenceValueSchema = z.object({
  id: z.number().int(),
  category: z.string(),
  code: z.string(),
  label: z.string(),
  sortOrder: z.number().int(),
  semantic: z.string().nullable(),
  isActive: z.boolean(),
});

export const ReferenceDataResponseSchema = z.object({
  values: z.array(ReferenceValueSchema),
});

export type ReferenceValue = z.infer<typeof ReferenceValueSchema>;
export type ReferenceDataResponse = z.infer<typeof ReferenceDataResponseSchema>;
