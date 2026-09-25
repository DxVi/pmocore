import type { WorkItem, WorkItemCreate, WorkItemDetail, WorkItemUpdate } from '@pmocore/shared';
import { createRecordApi } from './common/record-api';

export const workItemsApi = createRecordApi<
  WorkItem,
  WorkItemDetail,
  WorkItemCreate,
  WorkItemUpdate
>('work-items');
