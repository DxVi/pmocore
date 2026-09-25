import type { ProjectMetrics } from '@pmocore/shared';

/**
 * Pure dashboard calculations (design §11.1). Inputs are aggregates read from
 * project records; nothing here is manually maintained. `null` means "not
 * available" and must never be presented as zero, complete or healthy (REQ-010).
 */
export type RawProjectAggregates = {
  /** Work items counted for progress (excludes Deferred/Cancelled). */
  planItems: number;
  /** Mean percent complete of counted items, with DONE items counted as 100. */
  planPercentAverage: number | null;
  requirementsTotal: number;
  requirementsOpen: number;
  actionsTotal: number;
  actionsOpen: number;
  actionsOverdue: number;
  issuesTotal: number;
  issuesOpen: number;
  testsTotal: number;
  testsFailed: number;
  testsRetest: number;
  defectsTotal: number;
  defectsOpen: number;
  milestone: { title: string; date: string } | null;
  lastActivityAt: string;
};

export type ManualMilestone = { label: string | null; date: string | null };

export function progressPercent(planItems: number, average: number | null): number | null {
  if (planItems === 0 || average === null) return null;
  return Math.round(Math.min(100, Math.max(0, average)));
}

/**
 * Next milestone: the earliest open milestone work item due today or later;
 * otherwise the manually maintained project milestone when it is not in the past.
 */
export function nextMilestone(
  fromWorkItems: { title: string; date: string } | null,
  manual: ManualMilestone,
  today: string,
): ProjectMetrics['nextMilestone'] {
  if (fromWorkItems)
    return { label: fromWorkItems.title, date: fromWorkItems.date, source: 'work-item' };
  if (manual.date && manual.date >= today) {
    return { label: manual.label ?? 'Milestone', date: manual.date, source: 'manual' };
  }
  return null;
}

export function buildProjectMetrics(
  raw: RawProjectAggregates,
  manual: ManualMilestone,
  today: string,
): ProjectMetrics {
  return {
    progressPercent: progressPercent(raw.planItems, raw.planPercentAverage),
    requirements: { open: raw.requirementsOpen, total: raw.requirementsTotal },
    actions: { open: raw.actionsOpen, total: raw.actionsTotal, overdue: raw.actionsOverdue },
    issues: { open: raw.issuesOpen, total: raw.issuesTotal },
    tests: { total: raw.testsTotal, failed: raw.testsFailed, retest: raw.testsRetest },
    defects: { open: raw.defectsOpen, total: raw.defectsTotal },
    nextMilestone: nextMilestone(raw.milestone, manual, today),
    lastActivityAt: raw.lastActivityAt,
  };
}

export function emptyAggregates(lastActivityAt: string): RawProjectAggregates {
  return {
    planItems: 0,
    planPercentAverage: null,
    requirementsTotal: 0,
    requirementsOpen: 0,
    actionsTotal: 0,
    actionsOpen: 0,
    actionsOverdue: 0,
    issuesTotal: 0,
    issuesOpen: 0,
    testsTotal: 0,
    testsFailed: 0,
    testsRetest: 0,
    defectsTotal: 0,
    defectsOpen: 0,
    milestone: null,
    lastActivityAt,
  };
}
