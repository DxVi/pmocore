import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import type {
  Acceptance,
  AcceptanceCreate,
  LookupType,
  RecordRef,
  ReleaseDetail,
} from '@pmocore/shared';
import { DerivedValue } from '@/components/DerivedValue';
import { asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { RecordPicker } from '@/components/RecordPicker';
import { StatusBadge } from '@/components/StatusBadge';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import {
  Detail,
  RecordActions,
  RefSelect,
  TextArea,
  TextInput,
  TextValue,
} from '@/features/plan/common/ui';
import { releasesApi, useCreateAcceptance, useDeleteAcceptance, useUpdateAcceptance } from './api';

const date = (value: string | null) => <DerivedValue value={formatDate(value)} unavailable="—" />;

type ScopeItem = RecordRef & { note: string | null };

/** Edits the requirements or defects included in a release, each with an optional note. */
function ScopeEditor({
  release,
  kind,
  editable,
}: {
  release: ReleaseDetail;
  kind: 'requirements' | 'defects';
  editable: boolean;
}) {
  const project = useCurrentProject();
  const current: ScopeItem[] =
    kind === 'requirements' ? release.includedRequirements : release.includedDefects;
  const replace = releasesApi.useReplace<{ items: object[] }>(project.id, release.id, kind);
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<ScopeItem[]>(current);
  const lookup: LookupType = kind === 'requirements' ? 'requirement' : 'defect';
  const moduleRoute = kind === 'requirements' ? '../../requirements' : '../../testing/defects';
  const idKey = kind === 'requirements' ? 'requirementId' : 'defectId';

  if (!editing) {
    return (
      <>
        {current.length === 0 ? (
          <p className="text-secondary mb-2">None included.</p>
        ) : (
          <ul className="list-unstyled d-grid gap-1 mb-2">
            {current.map((item) => (
              <li key={item.id}>
                <Link to={`${moduleRoute}/${item.id}`} relative="path" className="text-break">
                  <span className="text-secondary small me-2">{item.code}</span>
                  {item.title}
                </Link>
                {item.note && <span className="small text-secondary ms-2">{item.note}</span>}
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => {
              setItems(current);
              setEditing(true);
            }}
          >
            Edit included {kind}
          </button>
        )}
      </>
    );
  }

  return (
    <div className="border rounded p-3">
      {replace.error && (
        <div className="alert alert-danger py-2" role="alert">
          {errorMessage(replace.error)}
        </div>
      )}
      <RecordPicker
        projectId={project.id}
        type={lookup}
        label={`Included ${kind}`}
        multiple
        value={items}
        onChange={(next) =>
          setItems(next.map((ref) => items.find((i) => i.id === ref.id) ?? { ...ref, note: null }))
        }
      />
      {items.map((item) => (
        <div key={item.id} className="mb-2">
          <label htmlFor={`note-${item.id}`} className="form-label small mb-1">
            Note for {item.code}
          </label>
          <input
            id={`note-${item.id}`}
            className="form-control form-control-sm"
            placeholder="e.g. revision 2, regression fix"
            value={item.note ?? ''}
            onChange={(event) =>
              setItems(
                items.map((i) =>
                  i.id === item.id ? { ...i, note: event.target.value || null } : i,
                ),
              )
            }
          />
        </div>
      ))}
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
              { items: items.map((i) => ({ [idKey]: i.id, note: i.note })) },
              { onSuccess: () => setEditing(false) },
            )
          }
        >
          Save
        </button>
      </div>
    </div>
  );
}

type AcceptanceValues = {
  statusId: number | null;
  acceptanceDate: string;
  acceptedBy: string;
  certificateRef: string;
  handoverNotes: string;
  remarks: string;
};

function toAcceptanceValues(item?: Acceptance): AcceptanceValues {
  return {
    statusId: item?.statusId ?? null,
    acceptanceDate: item?.acceptanceDate ?? '',
    acceptedBy: item?.acceptedBy ?? '',
    certificateRef: item?.certificateRef ?? '',
    handoverNotes: item?.handoverNotes ?? '',
    remarks: item?.remarks ?? '',
  };
}

function AcceptanceForm({
  releaseId,
  item,
  onClose,
}: {
  releaseId: string;
  item?: Acceptance;
  onClose: () => void;
}) {
  const project = useCurrentProject();
  const create = useCreateAcceptance(project.id, releaseId);
  const update = useUpdateAcceptance(project.id);
  const mutation = item ? update : create;
  const { register, handleSubmit } = useForm<AcceptanceValues>({
    defaultValues: toAcceptanceValues(item),
  });

  const submit = handleSubmit(async (values) => {
    const payload: AcceptanceCreate = {
      statusId: values.statusId,
      acceptanceDate: values.acceptanceDate || null,
      acceptedBy: values.acceptedBy || null,
      certificateRef: values.certificateRef || null,
      // Preserved unchanged: no document picker until documents are linked here.
      certificateDocumentId: item?.certificateDocumentId ?? null,
      handoverNotes: values.handoverNotes || null,
      remarks: values.remarks || null,
    };
    if (item)
      await update.mutateAsync({ id: item.id, input: { ...payload, version: item.version } });
    else await create.mutateAsync(payload);
    onClose();
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="border rounded p-3 mb-3"
      aria-label={item ? `Edit ${item.code}` : 'New acceptance'}
    >
      {mutation.error && (
        <div className="alert alert-danger py-2" role="alert">
          {errorMessage(mutation.error)}
        </div>
      )}
      <div className="row">
        <div className="col-md-4">
          <RefSelect
            id={`acc-status-${item?.id ?? 'new'}`}
            label="Acceptance status"
            category="STATUS"
            currentId={item?.statusId}
            registration={register('statusId', { setValueAs: asOptionalNumber })}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id={`acc-date-${item?.id ?? 'new'}`}
            type="date"
            label="Acceptance date"
            registration={register('acceptanceDate')}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id={`acc-by-${item?.id ?? 'new'}`}
            label="Accepted by"
            registration={register('acceptedBy')}
          />
        </div>
      </div>
      <TextInput
        id={`acc-cert-${item?.id ?? 'new'}`}
        label="Certificate / document reference"
        registration={register('certificateRef')}
      />
      <TextArea
        id={`acc-handover-${item?.id ?? 'new'}`}
        label="Handover notes"
        rows={2}
        registration={register('handoverNotes')}
      />
      <TextArea
        id={`acc-remarks-${item?.id ?? 'new'}`}
        label="Remarks"
        rows={2}
        registration={register('remarks')}
      />
      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {item ? 'Save acceptance' : 'Add acceptance'}
        </button>
      </div>
    </form>
  );
}

function AcceptanceHistory({ release, editable }: { release: ReleaseDetail; editable: boolean }) {
  const project = useCurrentProject();
  const remove = useDeleteAcceptance(project.id);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      {editable && editing === null && (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary mb-3"
          onClick={() => setEditing('new')}
        >
          <Plus size={16} aria-hidden="true" className="me-1" />
          Record acceptance
        </button>
      )}
      {editing === 'new' && (
        <AcceptanceForm releaseId={release.id} onClose={() => setEditing(null)} />
      )}
      {remove.error && (
        <div className="alert alert-danger py-2" role="alert">
          {errorMessage(remove.error)}
        </div>
      )}
      {release.acceptances.length === 0 ? (
        <p className="text-secondary mb-0">No acceptance recorded.</p>
      ) : (
        <ol
          className="list-unstyled d-grid gap-3 mb-0"
          aria-label="Acceptance history (newest first)"
        >
          {release.acceptances.map((a, index) =>
            editing === a.id ? (
              <li key={a.id}>
                <AcceptanceForm releaseId={release.id} item={a} onClose={() => setEditing(null)} />
              </li>
            ) : (
              <li key={a.id} className="border rounded p-3">
                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                  <span className="text-secondary small">{a.code}</span>
                  <StatusBadge valueId={a.statusId} emptyLabel="Status not set" />
                  {index === 0 && <span className="small text-secondary">Current</span>}
                  {editable && (
                    <span className="ms-auto d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setEditing(a.id)}
                        aria-label={`Edit ${a.code}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => remove.mutate(a.id)}
                        disabled={remove.isPending}
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </div>
                <dl className="row small mb-0">
                  <Detail label="Date">{date(a.acceptanceDate)}</Detail>
                  <Detail label="Accepted by">
                    <TextValue value={a.acceptedBy} />
                  </Detail>
                  <Detail label="Certificate">
                    <TextValue value={a.certificateRef} />
                  </Detail>
                  {a.handoverNotes && (
                    <Detail label="Handover notes" wide>
                      {a.handoverNotes}
                    </Detail>
                  )}
                  {a.remarks && (
                    <Detail label="Remarks" wide>
                      {a.remarks}
                    </Detail>
                  )}
                </dl>
              </li>
            ),
          )}
        </ol>
      )}
    </>
  );
}

export function ReleaseDetailPage() {
  const project = useCurrentProject();
  const { recordId = '' } = useParams();
  const { data: release, isLoading, error, refetch } = releasesApi.useDetail(project.id, recordId);
  const remove = releasesApi.useDelete(project.id, recordId);
  const editable = !project.archivedAt;

  if (isLoading) return <LoadingState />;
  if (error || !release) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title={release.name ? `${release.versionLabel} · ${release.name}` : release.versionLabel}
        code={release.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2">
            <StatusBadge valueId={release.environmentId} emptyLabel="Environment not set" />
            <StatusBadge
              valueId={release.deploymentStatusId}
              emptyLabel="Deployment status not set"
            />
          </span>
        }
        actions={
          editable && (
            <RecordActions
              entity="release"
              remove={remove}
              deleteMessage="Releases with acceptance records or planned requirements/defects cannot be deleted."
            />
          )
        }
      />
      <div className="row g-4">
        <div className="col-lg-6">
          <section className="card mb-4" aria-label="Release details">
            <div className="card-body">
              <dl className="row mb-0">
                <Detail label="Planned date">{date(release.plannedDate)}</Detail>
                <Detail label="Release date">{date(release.releaseDate)}</Detail>
                <Detail label="Demo date">{date(release.demoDate)}</Detail>
                <Detail label="UAT date">{date(release.uatDate)}</Detail>
                <Detail label="UAT result">
                  <StatusBadge valueId={release.uatResultId} emptyLabel="—" />
                </Detail>
                <Detail label="Delivery date">{date(release.deliveryDate)}</Detail>
                <Detail label="Training / turnover">{date(release.trainingDate)}</Detail>
                <Detail label="Scope" wide>
                  <TextValue value={release.scope} />
                </Detail>
                <Detail label="Remarks" wide>
                  <TextValue value={release.remarks} />
                </Detail>
              </dl>
            </div>
          </section>
          <section className="card" aria-labelledby="release-scope">
            <div className="card-body">
              <h2 id="release-scope" className="h5 mb-3">
                Included in this release
              </h2>
              <h3 className="h6 text-secondary">Requirements</h3>
              <div className="mb-4">
                <ScopeEditor
                  key={`r-${release.version}`}
                  release={release}
                  kind="requirements"
                  editable={editable}
                />
              </div>
              <h3 className="h6 text-secondary">Defects</h3>
              <ScopeEditor
                key={`d-${release.version}`}
                release={release}
                kind="defects"
                editable={editable}
              />
            </div>
          </section>
        </div>
        <div className="col-lg-6">
          <section className="card" aria-labelledby="release-acceptance">
            <div className="card-body">
              <h2 id="release-acceptance" className="h5 mb-3">
                Acceptance
              </h2>
              <AcceptanceHistory release={release} editable={editable} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
