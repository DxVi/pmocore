import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CountMetric, ProjectMetrics } from '@pmocore/shared';
import { DerivedValue } from '@/components/DerivedValue';
import { Badge } from '@/components/StatusBadge';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';

/**
 * Derived project metrics (REQ-007–010, 017–018). Missing data is shown as
 * "not available" — never as zero progress, complete or healthy.
 */
function Metric({ label, children, to }: { label: string; children: ReactNode; to?: string }) {
  return (
    <div className="col-6 col-md-4 col-xl-3">
      <div className="small text-secondary">{to ? <Link to={to}>{label}</Link> : label}</div>
      <div className="fw-medium">{children}</div>
    </div>
  );
}

export function ProgressValue({ value }: { value: number | null }) {
  return (
    <DerivedValue
      value={value}
      unavailable="No plan data"
      render={(percent) => (
        <span className="d-flex align-items-center gap-2">
          <span
            className="progress flex-grow-1"
            role="progressbar"
            aria-label="Plan progress"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ height: '0.5rem', maxWidth: '8rem' }}
          >
            <span className="progress-bar" style={{ width: `${percent}%` }} />
          </span>
          <span>{percent}%</span>
        </span>
      )}
    />
  );
}

function countText(metric: CountMetric, none: string) {
  return metric.total === 0 ? (
    <span className="text-secondary fst-italic">{none}</span>
  ) : (
    <span>
      {metric.open} open <span className="text-secondary small">of {metric.total}</span>
    </span>
  );
}

export function MilestoneValue({ milestone }: { milestone: ProjectMetrics['nextMilestone'] }) {
  return (
    <DerivedValue
      value={milestone}
      unavailable="No milestone"
      render={(m) => (
        <span>
          {m.label} · {formatDate(m.date)}
          {m.source === 'manual' && <span className="text-secondary small"> (manual)</span>}
        </span>
      )}
    />
  );
}

export function MetricsView({ metrics, base }: { metrics: ProjectMetrics; base?: string }) {
  const link = (path: string) => (base ? `${base}/${path}` : undefined);
  return (
    <div className="row g-3">
      <Metric label="Plan progress" to={link('plan')}>
        <ProgressValue value={metrics.progressPercent} />
      </Metric>
      <Metric label="Open requirements" to={link('requirements')}>
        {countText(metrics.requirements, 'No requirements yet')}
      </Metric>
      <Metric label="Open actions" to={link('raid')}>
        {metrics.actions.total === 0 ? (
          <span className="text-secondary fst-italic">No actions yet</span>
        ) : (
          <span className="d-inline-flex flex-wrap gap-2 align-items-center">
            {countText(metrics.actions, '')}
            {metrics.actions.overdue > 0 && (
              <Badge tone="danger">{`${metrics.actions.overdue} overdue`}</Badge>
            )}
          </span>
        )}
      </Metric>
      <Metric label="Open issues" to={link('raid')}>
        {countText(metrics.issues, 'No issues recorded')}
      </Metric>
      <Metric label="Tests" to={link('testing')}>
        {metrics.tests.total === 0 ? (
          <span className="text-secondary fst-italic">No tests yet</span>
        ) : (
          <span className="d-inline-flex flex-wrap gap-2 align-items-center">
            <span>{metrics.tests.total}</span>
            {metrics.tests.failed > 0 && (
              <Badge tone="danger">{`${metrics.tests.failed} failed`}</Badge>
            )}
            {metrics.tests.retest > 0 && (
              <Badge tone="info">{`${metrics.tests.retest} awaiting retest`}</Badge>
            )}
          </span>
        )}
      </Metric>
      <Metric label="Open defects" to={link('testing?view=defects')}>
        {countText(metrics.defects, 'No defects recorded')}
      </Metric>
      <Metric label="Next milestone" to={link('plan')}>
        <MilestoneValue milestone={metrics.nextMilestone} />
      </Metric>
      <Metric label="Last activity">
        <span title={formatDateTime(metrics.lastActivityAt)}>
          {formatRelative(metrics.lastActivityAt)}
        </span>
      </Metric>
    </div>
  );
}
