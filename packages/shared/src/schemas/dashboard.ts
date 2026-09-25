import { z } from 'zod';

/**
 * Dashboard contract (design §11.1), implemented in PKG-4.
 * `null` means "not available / not recorded" and must never be rendered as
 * complete or healthy (REQ-010).
 */
export const CountMetricSchema = z.object({
  open: z.number().int(),
  total: z.number().int(),
});

export const ProjectMetricsSchema = z.object({
  progressPercent: z.number().nullable(),
  requirements: CountMetricSchema,
  actions: CountMetricSchema.extend({ overdue: z.number().int() }),
  issues: CountMetricSchema,
  tests: z.object({ total: z.number().int(), failed: z.number().int(), retest: z.number().int() }),
  defects: CountMetricSchema,
  nextMilestone: z
    .object({
      label: z.string(),
      date: z.string(),
      source: z.enum(['work-item', 'manual']),
    })
    .nullable(),
  lastActivityAt: z.string(),
});

export const DashboardProjectSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  phaseId: z.number().int().nullable(),
  statusId: z.number().int().nullable(),
  healthId: z.number().int().nullable(),
  targetDate: z.string().nullable(),
  pmRemarks: z.string().nullable(),
  metrics: ProjectMetricsSchema,
});

export const DashboardResponseSchema = z.object({
  projects: z.array(DashboardProjectSchema),
  totals: z.object({
    activeProjects: z.number().int(),
    openRequirements: z.number().int(),
    openActions: z.number().int(),
    overdueActions: z.number().int(),
    openIssues: z.number().int(),
    failedTests: z.number().int(),
  }),
});

export type CountMetric = z.infer<typeof CountMetricSchema>;
export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>;
export type DashboardProject = z.infer<typeof DashboardProjectSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
