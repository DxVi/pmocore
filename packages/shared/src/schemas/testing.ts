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

// Test cases keep their latest result only (SA-2); retest is tracked on defects.
const testCaseFields = {
  module: optionalText(TEXT_MEDIUM),
  requirementId: optionalRecordId,
  stageId: optionalReferenceId,
  scenario: requiredText(TEXT_LONG),
  expectedResult: optionalText(TEXT_LONG),
  actualResult: optionalText(TEXT_LONG),
  testerName: optionalText(TEXT_MEDIUM),
  testDate: optionalDate,
  resultId: optionalReferenceId,
  statusId: optionalReferenceId,
  evidence: optionalText(TEXT_LONG),
  remarks: optionalText(TEXT_LONG),
};

export const TestCaseCreateSchema = z.object(testCaseFields);
export const TestCaseUpdateSchema = z.object({ ...testCaseFields, version });

export const TEST_CASE_SORT_FIELDS = ['code', 'testDate', 'updatedAt'] as const;

export const TestCaseListQuerySchema = listQuery(TEST_CASE_SORT_FIELDS, 'updatedAt').extend({
  requirementId: z.uuid().optional(),
  stageId: queryReferenceId,
  resultId: queryReferenceId,
  statusId: queryReferenceId,
});

export const TestCaseSchema = RecordMetaSchema.extend({
  module: z.string().nullable(),
  requirementId: z.uuid().nullable(),
  stageId: z.number().int().nullable(),
  scenario: z.string(),
  expectedResult: z.string().nullable(),
  actualResult: z.string().nullable(),
  testerName: z.string().nullable(),
  testDate: z.string().nullable(),
  resultId: z.number().int().nullable(),
  statusId: z.number().int().nullable(),
  evidence: z.string().nullable(),
  remarks: z.string().nullable(),
});

const defectFields = {
  testCaseId: optionalRecordId,
  externalRef: optionalText(TEXT_MEDIUM),
  title: requiredText(),
  description: optionalText(TEXT_LONG),
  severityId: optionalReferenceId,
  assigneeName: optionalText(TEXT_MEDIUM),
  statusId: optionalReferenceId,
  targetFixDate: optionalDate,
  targetFixReleaseId: optionalRecordId,
  retestDate: optionalDate,
  retestResultId: optionalReferenceId,
  remarks: optionalText(TEXT_LONG),
};

export const DefectCreateSchema = z.object(defectFields);
export const DefectUpdateSchema = z.object({ ...defectFields, version });

export const DEFECT_SORT_FIELDS = ['code', 'targetFixDate', 'severity', 'updatedAt'] as const;

export const DefectListQuerySchema = listQuery(DEFECT_SORT_FIELDS, 'updatedAt').extend({
  testCaseId: z.uuid().optional(),
  severityId: queryReferenceId,
  statusId: queryReferenceId,
  open: queryBoolean,
});

export const DefectSchema = RecordMetaSchema.extend({
  testCaseId: z.uuid().nullable(),
  externalRef: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  severityId: z.number().int().nullable(),
  assigneeName: z.string().nullable(),
  statusId: z.number().int().nullable(),
  targetFixDate: z.string().nullable(),
  targetFixReleaseId: z.uuid().nullable(),
  retestDate: z.string().nullable(),
  retestResultId: z.number().int().nullable(),
  remarks: z.string().nullable(),
});

export const TestCaseDetailSchema = TestCaseSchema.extend({
  requirement: RecordRefSchema.nullable(),
  defects: z.array(DefectSchema),
});

export const DefectDetailSchema = DefectSchema.extend({
  testCase: RecordRefSchema.nullable(),
  targetFixRelease: RecordRefSchema.nullable(),
  fixedIn: z.array(RecordRefSchema.extend({ note: z.string().nullable() })),
});

export type TestCaseCreateInput = z.input<typeof TestCaseCreateSchema>;
export type TestCaseCreate = z.infer<typeof TestCaseCreateSchema>;
export type TestCaseUpdate = z.infer<typeof TestCaseUpdateSchema>;
export type TestCaseListQuery = z.infer<typeof TestCaseListQuerySchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestCaseDetail = z.infer<typeof TestCaseDetailSchema>;
export type DefectCreateInput = z.input<typeof DefectCreateSchema>;
export type DefectCreate = z.infer<typeof DefectCreateSchema>;
export type DefectUpdate = z.infer<typeof DefectUpdateSchema>;
export type DefectListQuery = z.infer<typeof DefectListQuerySchema>;
export type Defect = z.infer<typeof DefectSchema>;
export type DefectDetail = z.infer<typeof DefectDetailSchema>;
