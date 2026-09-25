import { z } from 'zod';
import {
  TEXT_LONG,
  TEXT_MEDIUM,
  listQuery,
  optionalDate,
  optionalReferenceId,
  optionalText,
  queryReferenceId,
  requiredText,
  version,
} from './common.js';

export const PROJECT_CODE_PATTERN = /^[A-Z0-9-]{2,20}$/;

const projectFields = {
  name: requiredText(),
  summary: optionalText(TEXT_LONG),
  phaseId: optionalReferenceId,
  statusId: optionalReferenceId,
  healthId: optionalReferenceId,
  startDate: optionalDate,
  targetDate: optionalDate,
  goLiveDate: optionalDate,
  nextMilestoneLabel: optionalText(TEXT_MEDIUM),
  nextMilestoneDate: optionalDate,
  pmRemarks: optionalText(TEXT_LONG),
};

export const ProjectCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PROJECT_CODE_PATTERN, 'Use 2–20 characters: A–Z, 0–9 and hyphen'),
  ...projectFields,
});

/** The project code is immutable after creation (design §5.4). */
export const ProjectUpdateSchema = z.object({ ...projectFields, version });

export const PROJECT_SORT_FIELDS = ['code', 'name', 'targetDate', 'updatedAt'] as const;

export const ProjectListQuerySchema = listQuery(PROJECT_SORT_FIELDS, 'updatedAt').extend({
  archived: z.enum(['active', 'archived', 'all']).default('active'),
  phaseId: queryReferenceId,
  statusId: queryReferenceId,
  healthId: queryReferenceId,
});

export const ProjectSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  phaseId: z.number().int().nullable(),
  statusId: z.number().int().nullable(),
  healthId: z.number().int().nullable(),
  startDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  goLiveDate: z.string().nullable(),
  nextMilestoneLabel: z.string().nullable(),
  nextMilestoneDate: z.string().nullable(),
  pmRemarks: z.string().nullable(),
  ownerUserId: z.uuid(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.uuid(),
  updatedAt: z.string(),
  updatedBy: z.uuid(),
  version: z.number().int(),
});

export const RECENT_ACTIVITY_TYPES = [
  'project',
  'workItem',
  'requirement',
  'activity',
  'raidItem',
  'testCase',
  'defect',
  'release',
  'acceptance',
  'document',
] as const;

export const RecentActivityItemSchema = z.object({
  type: z.enum(RECENT_ACTIVITY_TYPES),
  id: z.uuid(),
  code: z.string(),
  title: z.string(),
  updatedAt: z.string(),
});

/**
 * Base project overview (PKG-1): manual project fields, last activity and recent
 * activity. Derived operational metrics are added by the dashboard package (PKG-4).
 */
export const ProjectOverviewSchema = z.object({
  project: ProjectSchema,
  lastActivityAt: z.string(),
  recentActivity: z.array(RecentActivityItemSchema),
});

export type ProjectCreateInput = z.input<typeof ProjectCreateSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdateInput = z.input<typeof ProjectUpdateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type RecentActivityItem = z.infer<typeof RecentActivityItemSchema>;
export type ProjectOverview = z.infer<typeof ProjectOverviewSchema>;
