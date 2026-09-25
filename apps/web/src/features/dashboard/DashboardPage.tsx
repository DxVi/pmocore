import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { DashboardResponse } from '@pmocore/shared';
import { DerivedValue } from '@/components/DerivedValue';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/format';
import { useDashboard } from './api';
import { MetricsView } from './MetricsView';

function Totals({ totals }: { totals: DashboardResponse['totals'] }) {
  const items: { label: string; value: number; tone?: 'danger' }[] = [
    { label: 'Active projects', value: totals.activeProjects },
    { label: 'Open requirements', value: totals.openRequirements },
    { label: 'Open actions', value: totals.openActions },
    { label: 'Overdue actions', value: totals.overdueActions, tone: 'danger' },
    { label: 'Open issues', value: totals.openIssues },
    { label: 'Failed tests', value: totals.failedTests, tone: 'danger' },
  ];
  return (
    <section aria-label="Totals across active projects" className="row g-2 mb-4">
      {items.map((item) => (
        <div key={item.label} className="col-6 col-md-4 col-xl-2">
          <div className="card h-100">
            <div className="card-body py-2 px-3">
              <div className="small text-secondary">{item.label}</div>
              <div className={`h4 mb-0 ${item.tone && item.value > 0 ? 'text-danger' : ''}`}>
                {item.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Operational dashboard derived from project records (REQ-006–011). */
export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={user ? `Welcome, ${user.displayName}` : undefined}
        actions={
          <Link to="/projects/new" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" className="me-1" />
            New project
          </Link>
        }
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.projects.length === 0}
        emptyMessage="No active projects yet. Create a project to start tracking."
      >
        {data && (
          <>
            <Totals totals={data.totals} />
            <div className="d-grid gap-3">
              {data.projects.map((project) => (
                <section key={project.id} className="card" aria-labelledby={`dash-${project.id}`}>
                  <div className="card-body">
                    <div className="d-flex flex-wrap align-items-start gap-2 mb-3">
                      <div className="me-auto min-w-0">
                        <div className="small text-secondary fw-semibold">{project.code}</div>
                        <h2 id={`dash-${project.id}`} className="h5 mb-1 text-break">
                          <Link to={`/projects/${project.id}`}>{project.name}</Link>
                        </h2>
                        <div className="small text-secondary">
                          Target date:{' '}
                          <DerivedValue
                            value={formatDate(project.targetDate)}
                            unavailable="Not set"
                          />
                        </div>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <StatusBadge valueId={project.phaseId} emptyLabel="Phase not set" />
                        <StatusBadge valueId={project.statusId} emptyLabel="Status not set" />
                        <StatusBadge valueId={project.healthId} emptyLabel="Health not assessed" />
                        {project.metrics.actions.overdue > 0 && (
                          <Badge tone="danger">{`${project.metrics.actions.overdue} overdue`}</Badge>
                        )}
                      </div>
                    </div>
                    <MetricsView metrics={project.metrics} base={`/projects/${project.id}`} />
                    {project.pmRemarks && (
                      <p className="small text-secondary mb-0 mt-3 pmo-prewrap text-break">
                        <span className="fw-semibold">PM remarks: </span>
                        {project.pmRemarks.length > 280
                          ? `${project.pmRemarks.slice(0, 280)}…`
                          : project.pmRemarks}
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
