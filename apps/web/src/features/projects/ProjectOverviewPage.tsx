import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, Pencil } from 'lucide-react';
import type { RecentActivityItem } from '@pmocore/shared';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DerivedValue } from '@/components/DerivedValue';
import { EmptyState, QueryState } from '@/components/QueryState';
import { errorMessage } from '@/lib/errors';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { useProjectMetrics } from '@/features/dashboard/api';
import { MetricsView } from '@/features/dashboard/MetricsView';
import { useProjectOverview, useSetProjectArchived } from './api';
import { useCurrentProject } from './project-context';

/** Module route for each recent-activity record type (acceptances open with their release). */
const ACTIVITY_ROUTES: Partial<Record<RecentActivityItem['type'], string>> = {
  workItem: 'plan',
  requirement: 'requirements',
  activity: 'meetings',
  raidItem: 'raid',
  testCase: 'testing/tests',
  defect: 'testing/defects',
  release: 'releases',
  document: 'documents',
};

const ACTIVITY_LABELS: Record<RecentActivityItem['type'], string> = {
  project: 'Project',
  workItem: 'Work item',
  requirement: 'Requirement',
  activity: 'Meeting / Visit',
  raidItem: 'RAID',
  testCase: 'Test',
  defect: 'Defect',
  release: 'Release',
  acceptance: 'Acceptance',
  document: 'Document',
};

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="col-6 col-lg-4 mb-3">
      <dt className="small text-secondary fw-normal">{label}</dt>
      <dd className="mb-0">{children}</dd>
    </div>
  );
}

export function ProjectOverviewPage() {
  const project = useCurrentProject();
  const overview = useProjectOverview(project.id);
  const metrics = useProjectMetrics(project.id);
  const setArchived = useSetProjectArchived(project.id);
  const [confirming, setConfirming] = useState(false);
  const archived = Boolean(project.archivedAt);

  const milestone =
    project.nextMilestoneLabel || project.nextMilestoneDate
      ? [project.nextMilestoneLabel, formatDate(project.nextMilestoneDate)]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {!archived && (
          <Link to="edit" className="btn btn-primary">
            <Pencil size={16} aria-hidden="true" className="me-1" />
            Edit project
          </Link>
        )}
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setConfirming(true)}
        >
          {archived ? (
            <ArchiveRestore size={16} aria-hidden="true" className="me-1" />
          ) : (
            <Archive size={16} aria-hidden="true" className="me-1" />
          )}
          {archived ? 'Unarchive' : 'Archive'}
        </button>
      </div>

      <section className="card mb-4" aria-labelledby="project-metrics-heading">
        <div className="card-body">
          <h2 id="project-metrics-heading" className="h5 mb-3">
            Status at a glance
          </h2>
          <QueryState
            isLoading={metrics.isLoading}
            error={metrics.error}
            onRetry={() => void metrics.refetch()}
          >
            {metrics.data && (
              <MetricsView metrics={metrics.data} base={`/projects/${project.id}`} />
            )}
          </QueryState>
        </div>
      </section>

      <div className="row g-4">
        <div className="col-lg-8">
          <section className="card h-100" aria-labelledby="project-details-heading">
            <div className="card-body">
              <h2 id="project-details-heading" className="h5 mb-3">
                Project details
              </h2>
              <p className="mb-4">
                <DerivedValue value={project.summary} unavailable="No summary recorded" />
              </p>
              <dl className="row mb-0">
                <Detail label="Current phase">
                  <StatusBadge valueId={project.phaseId} />
                </Detail>
                <Detail label="Overall status">
                  <StatusBadge valueId={project.statusId} />
                </Detail>
                <Detail label="Health">
                  <StatusBadge valueId={project.healthId} emptyLabel="Not assessed" />
                </Detail>
                <Detail label="Start date">
                  <DerivedValue value={formatDate(project.startDate)} unavailable="Not set" />
                </Detail>
                <Detail label="Target date">
                  <DerivedValue value={formatDate(project.targetDate)} unavailable="Not set" />
                </Detail>
                <Detail label="Go-live date">
                  <DerivedValue value={formatDate(project.goLiveDate)} unavailable="Not set" />
                </Detail>
                <Detail label="Next milestone">
                  <DerivedValue value={milestone} unavailable="No milestone" />
                </Detail>
                <Detail label="Last activity">
                  <DerivedValue
                    value={overview.data?.lastActivityAt}
                    render={(value) => (
                      <span title={formatDateTime(value)}>{formatRelative(value)}</span>
                    )}
                    unavailable="Loading…"
                  />
                </Detail>
              </dl>
              <h3 className="h6 mt-2">PM remarks</h3>
              <p className="mb-0 pmo-prewrap">
                <DerivedValue value={project.pmRemarks} unavailable="No remarks" />
              </p>
            </div>
          </section>
        </div>

        <div className="col-lg-4">
          <section className="card h-100" aria-labelledby="recent-activity-heading">
            <div className="card-body">
              <h2 id="recent-activity-heading" className="h5 mb-3">
                Recent activity
              </h2>
              <QueryState
                isLoading={overview.isLoading}
                error={overview.error}
                onRetry={() => void overview.refetch()}
              >
                {overview.data && overview.data.recentActivity.length > 0 ? (
                  <ul className="list-unstyled mb-0 d-grid gap-3">
                    {overview.data.recentActivity.map((item) => (
                      <li key={`${item.type}-${item.id}`}>
                        <div className="small text-secondary">
                          {ACTIVITY_LABELS[item.type]} · {item.code}
                        </div>
                        <div className="text-break">
                          {ACTIVITY_ROUTES[item.type] ? (
                            <Link to={`${ACTIVITY_ROUTES[item.type]}/${item.id}`}>
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </div>
                        <div
                          className="small text-secondary"
                          title={formatDateTime(item.updatedAt)}
                        >
                          {formatRelative(item.updatedAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No activity yet." />
                )}
              </QueryState>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={archived ? 'Unarchive project?' : 'Archive project?'}
        message={
          archived
            ? 'The project becomes active and editable again.'
            : 'The project becomes read-only and leaves the active list. All records are kept and can still be viewed.'
        }
        confirmLabel={archived ? 'Unarchive' : 'Archive'}
        tone={archived ? 'primary' : 'warning'}
        busy={setArchived.isPending}
        error={setArchived.error ? errorMessage(setArchived.error) : undefined}
        onCancel={() => {
          setArchived.reset();
          setConfirming(false);
        }}
        onConfirm={() => setArchived.mutate(!archived, { onSuccess: () => setConfirming(false) })}
      />
    </>
  );
}
