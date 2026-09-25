import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DerivedValue } from '@/components/DerivedValue';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { useDeleteRaidItem, useRaidItem } from './api';

function Detail({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`${wide ? 'col-12' : 'col-6 col-md-4'} mb-3`}>
      <dt className="small text-secondary fw-normal">{label}</dt>
      <dd className="mb-0 pmo-prewrap text-break">{children}</dd>
    </div>
  );
}

export function RaidDetailPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = useRaidItem(project.id, recordId);
  const remove = useDeleteRaidItem(project.id, recordId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editable = !project.archivedAt;

  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const text = (value: string | null) => <DerivedValue value={value} unavailable="—" />;

  return (
    <>
      <PageHeader
        title={item.title}
        code={item.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2 align-items-center">
            <StatusBadge valueId={item.typeId} />
            <StatusBadge valueId={item.statusId} />
            <StatusBadge valueId={item.priorityId} emptyLabel="No priority" />
            {item.overdue && <Badge tone="danger">Overdue</Badge>}
          </span>
        }
        actions={
          editable && (
            <>
              <Link to="edit" className="btn btn-primary">
                <Pencil size={16} aria-hidden="true" className="me-1" />
                Edit
              </Link>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} aria-hidden="true" className="me-1" />
                Delete
              </button>
            </>
          )
        }
      />

      <section className="card" aria-label="Item details">
        <div className="card-body">
          <dl className="row mb-0">
            <Detail label="Owner">{text(item.ownerName)}</Detail>
            <Detail label="Date raised">{formatDate(item.dateRaised)}</Detail>
            <Detail label="Due date">
              <DerivedValue value={formatDate(item.dueDate)} unavailable="No due date" />
            </Detail>
            <Detail label="Days open">{item.daysOpen}</Detail>
            <Detail label="Closed date">
              <DerivedValue value={formatDate(item.closedDate)} unavailable="Open" />
            </Detail>
            <Detail label="Probability">
              <StatusBadge valueId={item.probabilityId} emptyLabel="—" />
            </Detail>
            <Detail label="Description" wide>
              {text(item.description)}
            </Detail>
            <Detail label="Impact" wide>
              {text(item.impact)}
            </Detail>
            <Detail label="Mitigation / required action" wide>
              {text(item.mitigation)}
            </Detail>
            <Detail label="Decision / resolution" wide>
              {text(item.resolution)}
            </Detail>
            <Detail label="Evidence" wide>
              {text(item.evidence)}
            </Detail>
            <Detail label="Remarks" wide>
              {text(item.remarks)}
            </Detail>
            <Detail label="Source meeting / visit">
              {item.sourceActivity ? (
                <Link to={`../../meetings/${item.sourceActivity.id}`} relative="path">
                  {item.sourceActivity.code} · {item.sourceActivity.title}
                </Link>
              ) : (
                text(null)
              )}
            </Detail>
            <Detail label="Requirement">
              <DerivedValue
                value={item.requirement}
                render={(r) => `${r.code} · ${r.title}`}
                unavailable="—"
              />
            </Detail>
            <Detail label="Release">
              <DerivedValue
                value={item.release}
                render={(r) => `${r.code} · ${r.title}`}
                unavailable="—"
              />
            </Detail>
          </dl>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete item?"
        message="This permanently deletes the item. Use a Completed, Deferred or Cancelled status to close it instead."
        confirmLabel="Delete"
        tone="danger"
        busy={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : undefined}
        onCancel={() => {
          remove.reset();
          setConfirmDelete(false);
        }}
        onConfirm={() =>
          remove.mutate(undefined, { onSuccess: () => void navigate('..', { relative: 'path' }) })
        }
      />
    </>
  );
}
