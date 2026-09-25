import { z } from 'zod';
import {
  RecordMetaSchema,
  RecordRefSchema,
  TEXT_LONG,
  TEXT_MEDIUM,
  businessDate,
  listQuery,
  optionalDate,
  optionalRecordId,
  optionalReferenceId,
  optionalText,
  queryBoolean,
  queryReferenceId,
  referenceId,
  requiredText,
  version,
} from './common.js';

const raidFields = {
  typeId: referenceId,
  title: requiredText(),
  description: optionalText(TEXT_LONG),
  impact: optionalText(TEXT_LONG),
  ownerName: optionalText(TEXT_MEDIUM),
  dateRaised: businessDate,
  sourceActivityId: optionalRecordId,
  probabilityId: optionalReferenceId,
  priorityId: optionalReferenceId,
  dueDate: optionalDate,
  statusId: optionalReferenceId,
  mitigation: optionalText(TEXT_LONG),
  resolution: optionalText(TEXT_LONG),
  closedDate: optionalDate, // auto-set on transition to DONE/INACTIVE when blank; cleared on reopen
  evidence: optionalText(TEXT_LONG),
  remarks: optionalText(TEXT_LONG),
  requirementId: optionalRecordId,
  releaseId: optionalRecordId,
};

const closedOrder = (
  value: { dateRaised: string; closedDate: string | null },
  ctx: z.RefinementCtx,
) => {
  if (value.closedDate && value.closedDate < value.dateRaised) {
    ctx.addIssue({
      code: 'custom',
      path: ['closedDate'],
      message: 'Closed date cannot be before date raised',
    });
  }
};

export const RaidItemCreateSchema = z.object(raidFields).superRefine(closedOrder);
export const RaidItemUpdateSchema = z.object({ ...raidFields, version }).superRefine(closedOrder);

export const RAID_SORT_FIELDS = ['code', 'dateRaised', 'dueDate', 'priority', 'updatedAt'] as const;

export const RaidItemListQuerySchema = listQuery(RAID_SORT_FIELDS, 'dueDate').extend({
  typeId: queryReferenceId,
  statusId: queryReferenceId,
  priorityId: queryReferenceId,
  sourceActivityId: z.uuid().optional(),
  owner: z.string().trim().max(200).optional(),
  open: queryBoolean,
  overdue: queryBoolean,
});

export const RaidItemSchema = RecordMetaSchema.extend({
  typeId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  impact: z.string().nullable(),
  ownerName: z.string().nullable(),
  dateRaised: z.string(),
  sourceActivityId: z.uuid().nullable(),
  probabilityId: z.number().int().nullable(),
  priorityId: z.number().int().nullable(),
  dueDate: z.string().nullable(),
  statusId: z.number().int().nullable(),
  mitigation: z.string().nullable(),
  resolution: z.string().nullable(),
  closedDate: z.string().nullable(),
  evidence: z.string().nullable(),
  remarks: z.string().nullable(),
  requirementId: z.uuid().nullable(),
  releaseId: z.uuid().nullable(),
  // Derived (REQ-048), evaluated in APP_TIMEZONE.
  overdue: z.boolean(),
  daysOpen: z.number().int(),
});

export const RaidItemDetailSchema = RaidItemSchema.extend({
  sourceActivity: RecordRefSchema.nullable(),
  requirement: RecordRefSchema.nullable(),
  release: RecordRefSchema.nullable(),
});

export type RaidItemCreateInput = z.input<typeof RaidItemCreateSchema>;
export type RaidItemCreate = z.infer<typeof RaidItemCreateSchema>;
export type RaidItemUpdate = z.infer<typeof RaidItemUpdateSchema>;
export type RaidItemListQuery = z.infer<typeof RaidItemListQuerySchema>;
export type RaidItem = z.infer<typeof RaidItemSchema>;
export type RaidItemDetail = z.infer<typeof RaidItemDetailSchema>;
