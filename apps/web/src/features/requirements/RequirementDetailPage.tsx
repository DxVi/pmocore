import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { RecordRef, RequirementDetail } from '@pmocore/shared';
import { DerivedValue } from '@/components/DerivedValue';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { RecordPicker } from '@/components/RecordPicker';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { Detail, RecordActions, TextValue } from '@/features/plan/common/ui';
import { requirementsApi } from './api';

function TraceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="h6 text-secondary">{title}</h3>
      {children}
    </div>
  );
}

function RecordLink({ to, item }: { to: string; item: RecordRef }) {
  return (
    <Link to={to} relative="path" className="text-break">
      <span className="text-secondary small me-2">{item.code}</span>
      {item.title}
    </Link>
  );
}

/** Edits the full set of linked work items (REQ-027/069). */
function WorkItemLinks({
  requirement,
  editable,
}: {
  requirement: RequirementDetail;
  editable: boolean;
}) {
  const project = useCurrentProject();
  const replace = requirementsApi.useReplace<{ workItemIds: string[] }>(
    project.id,
    requirement.id,
    'work-items',
  );
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<RecordRef[]>(requirement.workItems);

  if (editing) {
    return (
      <div className="border rounded p-3">
        {replace.error && (
          <div className="alert alert-danger py-2" role="alert">
            {errorMessage(replace.error)}
          </div>
        )}
        <RecordPicker
          projectId={project.id}
          type="work-item"
          label="Linked work items"
          multiple
          value={selection}
          onChange={setSelection}
        />
        <div className="d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={replace.isPending}
            onClick={() =>
              replace.mutate(
                { workItemIds: selection.map((w) => w.id) },
                { onSuccess: () => setEditing(false) },
              )
            }
          >
            Save links
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {requirement.workItems.length === 0 ? (
        <p className="text-secondary mb-2">No linked work items.</p>
      ) : (
        <ul className="list-unstyled d-grid gap-1 mb-2">
          {requirement.workItems.map((w) => (
            <li key={w.id}>
              <RecordLink to={`../../plan/${w.id}`} item={w} />
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => {
            setSelection(requirement.workItems);
            setEditing(true);
          }}
        >
          Edit linked work items
        </button>
      )}
    </>
  );
}

export function RequirementDetailPage() {
  const project = useCurrentProject();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = requirementsApi.useDetail(project.id, recordId);
  const remove = requirementsApi.useDelete(project.id, recordId);
  const editable = !project.archivedAt;

  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title={item.statement}
        code={item.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2 align-items-center">
            <StatusBadge valueId={item.statusId} />
            <StatusBadge valueId={item.priorityId} emptyLabel="No priority" />
            {item.requirementTypeId && <StatusBadge valueId={item.requirementTypeId} />}
            {item.isChangeRequest && <Badge tone="info">Change request</Badge>}
          </span>
        }
        actions={
          editable && (
            <RecordActions
              entity="requirement"
              remove={remove}
              deleteMessage="Requirements that have tests, releases, RAID items or documents cannot be deleted; set a Cancelled or Deferred status instead."
            />
          )
        }
      />
      <div className="row g-4">
        <div className="col-lg-6">
          <section className="card h-100" aria-label="Requirement details">
            <div className="card-body">
              <dl className="row mb-0">
                <Detail label="Acceptance criteria" wide>
                  <TextValue value={item.acceptanceCriteria} unavailable="Not recorded" />
                </Detail>
                <Detail label="Module">
                  <TextValue value={item.module} />
                </Detail>
                <Detail label="Source / end user">
                  <TextValue value={item.source} />
                </Detail>
                <Detail label="Date raised">
                  <DerivedValue value={formatDate(item.dateRaised)} unavailable="—" />
                </Detail>
                <Detail label="Assignee">
                  <TextValue value={item.assigneeName} />
                </Detail>
                <Detail label="Last updated">{formatDate(item.updatedAt.slice(0, 10))}</Detail>
                <Detail label="Validation / evidence" wide>
                  <TextValue value={item.validationEvidence} />
                </Detail>
                <Detail label="Remarks" wide>
                  <TextValue value={item.remarks} />
                </Detail>
              </dl>
            </div>
          </section>
        </div>
        <div className="col-lg-6">
          <section className="card h-100" aria-labelledby="trace-heading">
            <div className="card-body">
              <h2 id="trace-heading" className="h5 mb-3">
                Traceability
              </h2>
              <TraceSection title="Work items">
                <WorkItemLinks key={item.version} requirement={item} editable={editable} />
              </TraceSection>
              <TraceSection title="Tests">
                {item.tests.length === 0 ? (
                  <p className="text-secondary mb-0">No tests.</p>
                ) : (
                  <ul className="list-unstyled d-grid gap-2 mb-0">
                    {item.tests.map((t) => (
                      <li key={t.id} className="d-flex flex-wrap gap-2 align-items-center">
                        <RecordLink to={`../../testing/tests/${t.id}`} item={t} />
                        <StatusBadge valueId={t.resultId} emptyLabel="No result" />
                      </li>
                    ))}
                  </ul>
                )}
              </TraceSection>
              <TraceSection title="Defects">
                {item.defects.length === 0 ? (
                  <p className="text-secondary mb-0">No defects.</p>
                ) : (
                  <ul className="list-unstyled d-grid gap-2 mb-0">
                    {item.defects.map((d) => (
                      <li key={d.id} className="d-flex flex-wrap gap-2 align-items-center">
                        <RecordLink to={`../../testing/defects/${d.id}`} item={d} />
                        <StatusBadge valueId={d.statusId} />
                        {d.retestResultId && (
                          <span className="small text-secondary d-inline-flex gap-1 align-items-center">
                            Retest <StatusBadge valueId={d.retestResultId} />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TraceSection>
              <TraceSection title="Target release">
                {item.targetRelease ? (
                  <RecordLink
                    to={`../../releases/${item.targetRelease.id}`}
                    item={item.targetRelease}
                  />
                ) : (
                  <p className="text-secondary mb-0">Not planned for a release.</p>
                )}
              </TraceSection>
              <TraceSection title="Released in">
                {item.releasedIn.length === 0 ? (
                  <p className="text-secondary mb-0">Not included in a release yet.</p>
                ) : (
                  <ul className="list-unstyled d-grid gap-2 mb-0">
                    {item.releasedIn.map((r) => (
                      <li key={r.id} className="d-flex flex-wrap gap-2 align-items-center">
                        <RecordLink to={`../../releases/${r.id}`} item={r} />
                        <StatusBadge
                          valueId={r.acceptanceStatusId}
                          emptyLabel="No acceptance yet"
                        />
                        {r.note && <span className="small text-secondary">{r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </TraceSection>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
