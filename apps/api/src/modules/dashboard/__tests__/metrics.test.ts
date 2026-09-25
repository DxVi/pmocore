import { describe, expect, it } from 'vitest';
import {
  buildProjectMetrics,
  emptyAggregates,
  nextMilestone,
  progressPercent,
} from '../metrics.js';

describe('dashboard metrics (design §11.1)', () => {
  it('reports progress as unavailable when there is no plan data, never as 0 %', () => {
    expect(progressPercent(0, null)).toBeNull();
    expect(progressPercent(3, 42.6)).toBe(43);
    expect(progressPercent(2, 100)).toBe(100);
  });

  it('prefers the earliest open milestone work item, then a future manual milestone', () => {
    const today = '2026-10-05';
    expect(
      nextMilestone(
        { title: 'Go-live', date: '2026-10-13' },
        { label: 'Manual', date: '2026-10-07' },
        today,
      ),
    ).toEqual({ label: 'Go-live', date: '2026-10-13', source: 'work-item' });
    expect(nextMilestone(null, { label: 'UAT', date: '2026-10-07' }, today)).toEqual({
      label: 'UAT',
      date: '2026-10-07',
      source: 'manual',
    });
    expect(nextMilestone(null, { label: 'Old', date: '2026-09-01' }, today)).toBeNull();
    expect(nextMilestone(null, { label: 'No date', date: null }, today)).toBeNull();
  });

  it('keeps counts, failed tests and tests awaiting retest distinct', () => {
    const metrics = buildProjectMetrics(
      {
        ...emptyAggregates('2026-10-05T01:00:00.000Z'),
        testsTotal: 5,
        testsFailed: 2,
        testsRetest: 1,
        actionsTotal: 4,
        actionsOpen: 3,
        actionsOverdue: 1,
      },
      { label: null, date: null },
      '2026-10-05',
    );
    expect(metrics.tests).toEqual({ total: 5, failed: 2, retest: 1 });
    expect(metrics.actions).toEqual({ total: 4, open: 3, overdue: 1 });
    expect(metrics.progressPercent).toBeNull();
    expect(metrics.nextMilestone).toBeNull();
  });
});
