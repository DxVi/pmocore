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
  optionalTime,
  queryBoolean,
  queryReferenceId,
  requiredText,
  version,
} from './common.js';

const activityFields = {
  activityTypeId: optionalReferenceId,
  title: requiredText(),
  activityDate: businessDate,
  startTime: optionalTime,
  endTime: optionalTime,
  modeId: optionalReferenceId,
  location: optionalText(TEXT_MEDIUM),
  endUsers: optionalText(TEXT_LONG),
  attendees: optionalText(TEXT_LONG),
  agenda: optionalText(TEXT_LONG),
  findings: optionalText(TEXT_LONG),
  outcomes: optionalText(TEXT_LONG),
  todoSummary: optionalText(TEXT_LONG),
  minutesRef: optionalText(TEXT_MEDIUM),
  minutesDocumentId: optionalRecordId,
  statusId: optionalReferenceId,
  nextScheduleDate: optionalDate,
  nextScheduleNote: optionalText(TEXT_MEDIUM),
  relatedRequirementId: optionalRecordId,
  previousActivityId: optionalRecordId,
};

const timeOrder = (
  value: { startTime: string | null; endTime: string | null },
  ctx: z.RefinementCtx,
) => {
  if (value.startTime && value.endTime && value.endTime < value.startTime) {
    ctx.addIssue({
      code: 'custom',
      path: ['endTime'],
      message: 'End time must be after start time',
    });
  }
};

/** `preparedByUserId` is set server-side to the authenticated user on create. */
export const ActivityCreateSchema = z.object(activityFields).superRefine(timeOrder);
export const ActivityUpdateSchema = z.object({ ...activityFields, version }).superRefine(timeOrder);

export const ACTIVITY_SORT_FIELDS = ['activityDate', 'code', 'updatedAt'] as const;

export const ActivityListQuerySchema = listQuery(ACTIVITY_SORT_FIELDS, 'activityDate').extend({
  activityTypeId: queryReferenceId,
  statusId: queryReferenceId,
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  upcoming: queryBoolean,
});

/** Quick-add follow-up actions from a Meeting/Visit (design §9.2). */
export const FollowUpActionSchema = z.object({
  raidTypeId: optionalReferenceId, // defaults to the "Action" RAID type
  title: requiredText(),
  ownerName: optionalText(TEXT_MEDIUM),
  dueDate: optionalDate,
  priorityId: optionalReferenceId,
});

export const FollowUpActionsRequestSchema = z.object({
  actions: z.array(FollowUpActionSchema).min(1).max(20),
});

export const ActivitySchema = RecordMetaSchema.extend({
  activityTypeId: z.number().int().nullable(),
  title: z.string(),
  activityDate: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  modeId: z.number().int().nullable(),
  location: z.string().nullable(),
  endUsers: z.string().nullable(),
  attendees: z.string().nullable(),
  agenda: z.string().nullable(),
  findings: z.string().nullable(),
  outcomes: z.string().nullable(),
  todoSummary: z.string().nullable(),
  minutesRef: z.string().nullable(),
  minutesDocumentId: z.uuid().nullable(),
  preparedByUserId: z.uuid().nullable(),
  statusId: z.number().int().nullable(),
  nextScheduleDate: z.string().nullable(),
  nextScheduleNote: z.string().nullable(),
  relatedRequirementId: z.uuid().nullable(),
  previousActivityId: z.uuid().nullable(),
});

export const ActivityListItemSchema = ActivitySchema.extend({
  openActionCount: z.number().int(),
  attachmentCount: z.number().int(),
});

export const ActivityFollowUpSchema = RecordRefSchema.extend({
  typeId: z.number().int(),
  ownerName: z.string().nullable(),
  dueDate: z.string().nullable(),
  statusId: z.number().int().nullable(),
  overdue: z.boolean(),
});

export const ActivityDetailSchema = ActivitySchema.extend({
  followUps: z.array(ActivityFollowUpSchema),
  relatedRequirement: RecordRefSchema.nullable(),
  attachmentCount: z.number().int(),
});

export type ActivityCreateInput = z.input<typeof ActivityCreateSchema>;
export type ActivityCreate = z.infer<typeof ActivityCreateSchema>;
export type ActivityUpdate = z.infer<typeof ActivityUpdateSchema>;
export type ActivityListQuery = z.infer<typeof ActivityListQuerySchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityListItem = z.infer<typeof ActivityListItemSchema>;
export type ActivityDetail = z.infer<typeof ActivityDetailSchema>;
export type FollowUpAction = z.infer<typeof FollowUpActionSchema>;
export type FollowUpActionsRequest = z.infer<typeof FollowUpActionsRequestSchema>;
