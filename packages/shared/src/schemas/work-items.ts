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
  recordId,
  requiredText,
  version,
} from './common.js';

const workItemFields = {
  phaseId: optionalReferenceId,
  workstream: optionalText(TEXT_MEDIUM),
  title: requiredText(),
  description: optionalText(TEXT_LONG),
  ownerName: optionalText(TEXT_MEDIUM),
  plannedStart: optionalDate,
  plannedEnd: optionalDate,
  actualStart: optionalDate,
  actualEnd: optionalDate,
  percentComplete: z.number().int().min(0).max(100).default(0),
  statusId: optionalReferenceId,
  priorityId: optionalReferenceId,
  isMilestone: z.boolean().default(false),
  dependencyNote: optionalText(TEXT_LONG),
  evidenceRef: optionalText(TEXT_MEDIUM),
  evidenceDocumentId: optionalRecordId,
  remarks: optionalText(TEXT_LONG),
};

const dateOrder = <
  T extends {
    plannedStart: string | null;
    plannedEnd: string | null;
    actualStart: string | null;
    actualEnd: string | null;
  },
>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  if (value.plannedStart && value.plannedEnd && value.plannedEnd < value.plannedStart) {
    ctx.addIssue({
      code: 'custom',
      path: ['plannedEnd'],
      message: 'Planned end must be on or after planned start',
    });
  }
  if (value.actualStart && value.actualEnd && value.actualEnd < value.actualStart) {
    ctx.addIssue({
      code: 'custom',
      path: ['actualEnd'],
      message: 'Actual end must be on or after actual start',
    });
  }
};

export const WorkItemCreateSchema = z.object(workItemFields).superRefine(dateOrder);
export const WorkItemUpdateSchema = z.object({ ...workItemFields, version }).superRefine(dateOrder);

export const WORK_ITEM_SORT_FIELDS = [
  'code',
  'title',
  'plannedEnd',
  'percentComplete',
  'updatedAt',
] as const;

export const WorkItemListQuerySchema = listQuery(WORK_ITEM_SORT_FIELDS, 'plannedEnd').extend({
  statusId: queryReferenceId,
  phaseId: queryReferenceId,
  priorityId: queryReferenceId,
  milestone: queryBoolean,
  open: queryBoolean,
});

/** Replace the full set of requirements linked to a work item, or vice versa. */
export const RequirementWorkItemLinksSchema = z.object({
  workItemIds: z.array(recordId).max(500),
});

export const WorkItemSchema = RecordMetaSchema.extend({
  phaseId: z.number().int().nullable(),
  workstream: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  ownerName: z.string().nullable(),
  plannedStart: z.string().nullable(),
  plannedEnd: z.string().nullable(),
  actualStart: z.string().nullable(),
  actualEnd: z.string().nullable(),
  percentComplete: z.number().int(),
  statusId: z.number().int().nullable(),
  priorityId: z.number().int().nullable(),
  isMilestone: z.boolean(),
  dependencyNote: z.string().nullable(),
  evidenceRef: z.string().nullable(),
  evidenceDocumentId: z.uuid().nullable(),
  remarks: z.string().nullable(),
});

export const WorkItemDetailSchema = WorkItemSchema.extend({
  requirements: z.array(RecordRefSchema),
});

export type WorkItemCreateInput = z.input<typeof WorkItemCreateSchema>;
export type WorkItemCreate = z.infer<typeof WorkItemCreateSchema>;
export type WorkItemUpdate = z.infer<typeof WorkItemUpdateSchema>;
export type WorkItemListQuery = z.infer<typeof WorkItemListQuerySchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type WorkItemDetail = z.infer<typeof WorkItemDetailSchema>;
