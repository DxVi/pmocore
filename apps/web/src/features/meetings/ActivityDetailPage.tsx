import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ListPlus, Pencil, Trash2 } from 'lucide-react';
import { AttachmentPanel } from '@/components/attachments/AttachmentPanel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DerivedValue } from '@/components/DerivedValue';
import { asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { useReferenceData } from '@/hooks/useReferenceData';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { useActivity, useAddFollowUps, useDeleteActivity } from './api';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="h6 text-secondary mb-1">{title}</h3>
      <div className="pmo-prewrap text-break">{children}</div>
    </div>
  );
}

type QuickAddValues = {
  title: string;
  ownerName: string;
  dueDate: string;
  raidTypeId: number | null;
};

/** Quick-add follow-ups (design §9.3): three fields, repeatable, usable one-handed on a phone. */
function QuickAddFollowUp({ projectId, activityId }: { projectId: string; activityId: string }) {
  const add = useAddFollowUps(projectId, activityId);
  const { options } = useReferenceData();
  const actionTypeId = options('RAID_TYPE').find((v) => v.code === 'ACTION')?.id ?? null;
  const { register, handleSubmit, reset, formState } = useForm<QuickAddValues>({
    defaultValues: { title: '', ownerName: '', dueDate: '', raidTypeId: actionTypeId },
  });

  const submit = handleSubmit(async (values) => {
    await add.mutateAsync({
      actions: [
        {
          title: values.title.trim(),
          ownerName: values.ownerName.trim() || null,
          dueDate: values.dueDate || null,
          raidTypeId: values.raidTypeId,
          priorityId: null,
        },
      ],
    });
    reset({ title: '', ownerName: '', dueDate: '', raidTypeId: values.raidTypeId });
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="border rounded p-3 mt-3"
      aria-label="Quick add follow-up"
    >
      {add.error && (
        <div className="alert alert-danger py-2" role="alert">
          {errorMessage(add.error)}
        </div>
      )}
      <div className="row g-2">
        <div className="col-12 col-md-5">
          <label htmlFor="followup-title" className="form-label small mb-1">
            Follow-up
          </label>
          <input
            id="followup-title"
            className={`form-control ${formState.errors.title ? 'is-invalid' : ''}`}
            placeholder="What needs to happen?"
            {...register('title', { validate: (v) => v.trim().length > 0 || 'Required' })}
          />
          {formState.errors.title && (
            <div className="invalid-feedback">{formState.errors.title.message}</div>
          )}
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="followup-type" className="form-label small mb-1">
            Type
          </label>
          <select
            id="followup-type"
            className="form-select"
            {...register('raidTypeId', { setValueAs: asOptionalNumber })}
          >
            {options('RAID_TYPE').map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="followup-owner" className="form-label small mb-1">
            Owner
          </label>
          <input id="followup-owner" className="form-control" {...register('ownerName')} />
        </div>
        <div className="col-8 col-md-2">
          <label htmlFor="followup-due" className="form-label small mb-1">
            Due date
          </label>
          <input id="followup-due" type="date" className="form-control" {...register('dueDate')} />
        </div>
        <div className="col-4 col-md-1 d-flex align-items-end">
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={formState.isSubmitting}
            aria-label="Add follow-up"
          >
            <ListPlus size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}

export function ActivityDetailPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const location = useLocation();
  const { recordId = '' } = useParams();
  const { data: activity, isLoading, error, refetch } = useActivity(project.id, recordId);
  const remove = useDeleteActivity(project.id, recordId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editable = !project.archivedAt;

  // "Save and add attachments" lands here with #attachments: bring the panel into view.
  useEffect(() => {
    if (activity && location.hash === '#attachments') {
      document
        .getElementById('attachments')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activity, location.hash]);

  if (isLoading) return <LoadingState />;
  if (error || !activity) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const time = [activity.startTime?.slice(0, 5), activity.endTime?.slice(0, 5)]
    .filter(Boolean)
    .join('–');

  return (
    <>
      <PageHeader
        title={activity.title}
        code={activity.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2 align-items-center">
            <span>
              {formatDate(activity.activityDate)} {time}
            </span>
            {activity.location && <span>· {activity.location}</span>}
            <StatusBadge valueId={activity.activityTypeId} emptyLabel="Type not set" />
            <StatusBadge valueId={activity.statusId} />
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

      <div className="row g-4">
        <div className="col-lg-7">
          <section className="card mb-4" aria-label="Details">
            <div className="card-body">
              <div className="row">
                <div className="col-sm-6">
                  <Section title="End users">
                    <DerivedValue value={activity.endUsers} unavailable="Not recorded" />
                  </Section>
                </div>
                <div className="col-sm-6">
                  <Section title="Attendees">
                    <DerivedValue value={activity.attendees} unavailable="Not recorded" />
                  </Section>
                </div>
              </div>
              <Section title="Agenda">
                <DerivedValue value={activity.agenda} unavailable="Not recorded" />
              </Section>
              <Section title="Discussion / findings">
                <DerivedValue value={activity.findings} unavailable="Not recorded" />
              </Section>
              <Section title="Outcomes / decisions">
                <DerivedValue value={activity.outcomes} unavailable="Not recorded" />
              </Section>
              <Section title="To-do summary">
                <DerivedValue value={activity.todoSummary} unavailable="Not recorded" />
              </Section>
              <div className="row">
                <div className="col-sm-6">
                  <Section title="Next schedule">
                    <DerivedValue
                      value={
                        [formatDate(activity.nextScheduleDate), activity.nextScheduleNote]
                          .filter(Boolean)
                          .join(' · ') || null
                      }
                      unavailable="Not scheduled"
                    />
                  </Section>
                </div>
                <div className="col-sm-6">
                  <Section title="Minutes / document reference">
                    <DerivedValue value={activity.minutesRef} unavailable="None" />
                  </Section>
                </div>
              </div>
              <Section title="Related requirement">
                <DerivedValue
                  value={activity.relatedRequirement}
                  render={(r) => (
                    <Link to={`../../requirements/${r.id}`} relative="path">
                      {r.code} · {r.title}
                    </Link>
                  )}
                  unavailable="None"
                />
              </Section>
            </div>
          </section>

          <section className="card" aria-labelledby="followups-heading">
            <div className="card-body">
              <h2 id="followups-heading" className="h5 mb-3">
                Follow-up actions
              </h2>
              {activity.followUps.length === 0 ? (
                <p className="text-secondary mb-0">No follow-ups yet.</p>
              ) : (
                <ul className="list-group">
                  {activity.followUps.map((item) => (
                    <li key={item.id} className="list-group-item">
                      <Link
                        to={`../../raid/${item.id}`}
                        relative="path"
                        className="fw-medium text-break"
                      >
                        <span className="text-secondary small me-2">{item.code}</span>
                        {item.title}
                      </Link>
                      <div className="d-flex flex-wrap gap-2 align-items-center small mt-1">
                        <StatusBadge valueId={item.statusId} />
                        {item.overdue && <Badge tone="danger">Overdue</Badge>}
                        <span className="text-secondary">
                          {item.ownerName ?? 'No owner'} ·{' '}
                          {item.dueDate ? `Due ${formatDate(item.dueDate)}` : 'No due date'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {editable && <QuickAddFollowUp projectId={project.id} activityId={activity.id} />}
            </div>
          </section>
        </div>

        <div className="col-lg-5" id="attachments">
          <AttachmentPanel
            projectId={project.id}
            parentType="activity"
            parentId={activity.id}
            editable={editable}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete meeting / visit?"
        message="This removes the record and its attachments. Records with follow-up actions cannot be deleted."
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
