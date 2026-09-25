import type {
  Defect,
  DefectCreate,
  DefectDetail,
  DefectUpdate,
  TestCase,
  TestCaseCreate,
  TestCaseDetail,
  TestCaseUpdate,
} from '@pmocore/shared';
import { createRecordApi } from '@/features/plan/common/record-api';

export const testsApi = createRecordApi<TestCase, TestCaseDetail, TestCaseCreate, TestCaseUpdate>(
  'tests',
);
export const defectsApi = createRecordApi<Defect, DefectDetail, DefectCreate, DefectUpdate>(
  'defects',
);
