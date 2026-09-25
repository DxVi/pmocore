import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { DashboardResponse, ProjectMetrics } from '@pmocore/shared';
import { jsonResponse, renderWithProviders } from '@/test/render';
import { DashboardPage } from '../DashboardPage';

const EMPTY: ProjectMetrics = {
  progressPercent: null,
  requirements: { open: 0, total: 0 },
  actions: { open: 0, total: 0, overdue: 0 },
  issues: { open: 0, total: 0 },
  tests: { total: 0, failed: 0, retest: 0 },
  defects: { open: 0, total: 0 },
  nextMilestone: null,
  lastActivityAt: '2026-10-05T01:00:00.000Z',
};

const DASHBOARD: DashboardResponse = {
  projects: [
    {
      id: '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'DEMO-QMS',
      name: 'Queueing System',
      phaseId: null,
      statusId: 1,
      healthId: 4,
      targetDate: '2026-10-13',
      pmRemarks: 'Site visit went well',
      metrics: {
        ...EMPTY,
        progressPercent: 62,
        requirements: { open: 3, total: 10 },
        actions: { open: 4, total: 6, overdue: 2 },
        tests: { total: 5, failed: 1, retest: 2 },
        nextMilestone: { label: 'Go-live', date: '2026-10-13', source: 'work-item' },
      },
    },
    {
      id: '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'NEW',
      name: 'New project',
      phaseId: null,
      statusId: null,
      healthId: null,
      targetDate: null,
      pmRemarks: null,
      metrics: EMPTY,
    },
  ],
  totals: {
    activeProjects: 2,
    openRequirements: 3,
    openActions: 4,
    overdueActions: 2,
    openIssues: 0,
    failedTests: 1,
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('Dashboard', () => {
  it('shows derived metrics and never presents missing data as healthy or complete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, { success: true, data: DASHBOARD }))),
    );
    renderWithProviders(<DashboardPage />);

    const totals = await screen.findByRole('region', { name: 'Totals across active projects' });
    expect(within(totals).getByText('Overdue actions').nextSibling).toHaveTextContent('2');

    const qms = screen.getByRole('region', { name: 'Queueing System' });
    expect(within(qms).getByText('62%')).toBeInTheDocument();
    expect(within(qms).getAllByText('2 overdue').length).toBeGreaterThan(0);
    expect(within(qms).getByText('1 failed')).toBeInTheDocument();
    expect(within(qms).getByText('2 awaiting retest')).toBeInTheDocument();
    expect(within(qms).getByText(/Go-live/)).toBeInTheDocument();
    expect(within(qms).getByText('Green')).toBeInTheDocument();

    const fresh = screen.getByRole('region', { name: 'New project' });
    expect(within(fresh).getByText('No plan data')).toBeInTheDocument();
    expect(within(fresh).getByText('Health not assessed')).toBeInTheDocument();
    expect(within(fresh).getByText('No requirements yet')).toBeInTheDocument();
    expect(within(fresh).getByText('No tests yet')).toBeInTheDocument();
    expect(within(fresh).getByText('No milestone')).toBeInTheDocument();
    expect(within(fresh).getByText('Not set')).toBeInTheDocument();
    expect(within(fresh).queryByText(/0%/)).not.toBeInTheDocument();
  });
});
