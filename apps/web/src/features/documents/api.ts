import type {
  DocumentCreate,
  DocumentDetail,
  DocumentUpdate,
  ProjectDocument,
} from '@pmocore/shared';
import { createRecordApi } from '@/features/plan/common/record-api';

// Keyed under ['projects', id, 'documents'], which the attachment panel refreshes.
export const documentsApi = createRecordApi<
  ProjectDocument,
  DocumentDetail,
  DocumentCreate,
  DocumentUpdate
>('documents');
