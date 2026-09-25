import type {
  Requirement,
  RequirementCreate,
  RequirementDetail,
  RequirementUpdate,
} from '@pmocore/shared';
import { createRecordApi } from '@/features/plan/common/record-api';

export const requirementsApi = createRecordApi<
  Requirement,
  RequirementDetail,
  RequirementCreate,
  RequirementUpdate
>('requirements');
