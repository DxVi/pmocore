import { Link, useParams } from 'react-router-dom';
import { DerivedValue } from '@/components/DerivedValue';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { workItemsApi } from './api';
import { Detail, RecordActions, TextValue } from './common/ui';

const date = (value: string | null) => <DerivedValue value={formatDate(value)} unavailable="—" />;

export function WorkItemDetailPage() {
  const project = useCurrentProject();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = workItemsApi.useDetail(project.id, recordId);
  const remove = workItemsApi.useDelete(project.id, recordId);

  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title={item.title}
        code={item.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2 align-items-center">
            <StatusBadge valueId={item.phaseId} emptyLabel="Phase not set" />
            <StatusBadge valueId={item.statusId} />
            <StatusBadge valueId={item.priorityId} emptyLabel="No priority" />
            {item.isMilestone && <Badge tone="warning">Milestone</Badge>}
          </span>
        }
        actions={
          !project.archivedAt && (
            <RecordActions
              entity="work item"
              remove={remove}
              deleteMessage="The work item and its requirement links are deleted. Items referenced by documents cannot be deleted."
            />
          )
        }
      />
      <section className="card mb-4" aria-label="Work item details">
        <div className="card-body">
          <dl className="row mb-0">
            <Detail label="Module / workstream">
              <TextValue value={item.workstream} />
            </Detail>
            <Detail label="Owner">
              <TextValue value={item.ownerName} />
            </Detail>
            <Detail label="Percent complete">{item.percentComplete}%</Detail>
            <Detail label="Planned start">{date(item.plannedStart)}</Detail>
            <Detail label="Planned end">{date(item.plannedEnd)}</Detail>
            <Detail label="Last updated">{formatDate(item.updatedAt.slice(0, 10))}</Detail>
            <Detail label="Actual start">{date(item.actualStart)}</Detail>
            <Detail label="Actual end">{date(item.actualEnd)}</Detail>
            <Detail label="Evidence">
              <TextValue value={item.evidenceRef} />
            </Detail>
            <Detail label="Description" wide>
              <TextValue value={item.description} />
            </Detail>
            <Detail label="Dependency" wide>
              <TextValue value={item.dependencyNote} />
            </Detail>
            <Detail label="Remarks" wide>
              <TextValue value={item.remarks} />
            </Detail>
          </dl>
        </div>
      </section>
      <section className="card" aria-labelledby="wi-requirements">
        <div className="card-body">
          <h2 id="wi-requirements" className="h5 mb-3">
            Related requirements
          </h2>
          {item.requirements.length === 0 ? (
            <p className="text-secondary mb-0">
              Not linked to a requirement. Link work items from the requirement&apos;s page.
            </p>
          ) : (
            <ul className="list-unstyled mb-0 d-grid gap-2">
              {item.requirements.map((r) => (
                <li key={r.id}>
                  <Link to={`../../requirements/${r.id}`} relative="path">
                    <span className="text-secondary small me-2">{r.code}</span>
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
