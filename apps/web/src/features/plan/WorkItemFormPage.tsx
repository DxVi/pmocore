import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  WorkItemCreateSchema,
  WorkItemUpdateSchema,
  type WorkItemCreate,
  type WorkItemCreateInput,
  type WorkItemDetail,
  type WorkItemUpdate,
} from '@pmocore/shared';
import { applyServerErrors, asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { useCurrentProject } from '@/features/projects/project-context';
import { workItemsApi } from './api';
import {
  ArchivedNotice,
  FormActions,
  FormError,
  RefSelect,
  TextArea,
  TextInput,
} from './common/ui';

type FormValues = WorkItemCreateInput & { version?: number };

const FIELDS = [
  'phaseId',
  'workstream',
  'title',
  'description',
  'ownerName',
  'plannedStart',
  'plannedEnd',
  'actualStart',
  'actualEnd',
  'percentComplete',
  'statusId',
  'priorityId',
  'isMilestone',
  'dependencyNote',
  'evidenceRef',
  'remarks',
] as const;

function toFormValues(item?: WorkItemDetail): FormValues {
  return {
    phaseId: item?.phaseId ?? null,
    workstream: item?.workstream ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    ownerName: item?.ownerName ?? '',
    plannedStart: item?.plannedStart ?? '',
    plannedEnd: item?.plannedEnd ?? '',
    actualStart: item?.actualStart ?? '',
    actualEnd: item?.actualEnd ?? '',
    percentComplete: item?.percentComplete ?? 0,
    statusId: item?.statusId ?? null,
    priorityId: item?.priorityId ?? null,
    isMilestone: item?.isMilestone ?? false,
    dependencyNote: item?.dependencyNote ?? '',
    evidenceRef: item?.evidenceRef ?? '',
    // No editor here yet: preserved unchanged on update (full-replacement PUT).
    evidenceDocumentId: item?.evidenceDocumentId ?? null,
    remarks: item?.remarks ?? '',
    version: item?.version,
  };
}

type FormProps = {
  item?: WorkItemDetail;
  onSubmit: (values: WorkItemCreate | WorkItemUpdate) => Promise<WorkItemDetail>;
  onDone: (item: WorkItemDetail) => void;
  cancelTo: string;
};

function WorkItemForm({ item, onSubmit, onDone, cancelTo }: FormProps) {
  const [formError, setFormError] = useState<string>();
  const isEdit = Boolean(item);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: toFormValues(item),
    resolver: zodResolver(
      isEdit ? WorkItemUpdateSchema : WorkItemCreateSchema,
    ) as unknown as Resolver<FormValues>,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as WorkItemCreate | WorkItemUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  const refSelect = { setValueAs: asOptionalNumber };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      <FormError message={formError} />
      <div className="row">
        <div className="col-md-8">
          <TextInput
            id="wi-title"
            label="Deliverable / task"
            required
            registration={register('title')}
            error={errors.title}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id="wi-workstream"
            label="Module / workstream"
            registration={register('workstream')}
            error={errors.workstream}
          />
        </div>
      </div>
      <TextArea
        id="wi-description"
        label="Description"
        registration={register('description')}
        error={errors.description}
      />
      <div className="row">
        <div className="col-md-4">
          <RefSelect
            id="wi-phase"
            label="Phase"
            category="PROJECT_PHASE"
            currentId={item?.phaseId}
            registration={register('phaseId', refSelect)}
            error={errors.phaseId}
          />
        </div>
        <div className="col-md-4">
          <RefSelect
            id="wi-status"
            label="Status"
            category="STATUS"
            currentId={item?.statusId}
            registration={register('statusId', refSelect)}
            error={errors.statusId}
          />
        </div>
        <div className="col-md-4">
          <RefSelect
            id="wi-priority"
            label="Priority"
            category="PRIORITY"
            currentId={item?.priorityId}
            registration={register('priorityId', refSelect)}
            error={errors.priorityId}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <TextInput
            id="wi-owner"
            label="Owner"
            registration={register('ownerName')}
            error={errors.ownerName}
          />
        </div>
        <div className="col-6 col-md-4">
          <TextInput
            id="wi-percent"
            type="number"
            label="Percent complete"
            registration={register('percentComplete', { valueAsNumber: true })}
            error={errors.percentComplete}
          />
        </div>
        <div className="col-6 col-md-4 d-flex align-items-end mb-3">
          <div className="form-check">
            <input
              id="wi-milestone"
              type="checkbox"
              className="form-check-input"
              {...register('isMilestone')}
            />
            <label htmlFor="wi-milestone" className="form-check-label">
              Milestone
            </label>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-6 col-md-3">
          <TextInput
            id="wi-planned-start"
            type="date"
            label="Planned start"
            registration={register('plannedStart')}
            error={errors.plannedStart}
          />
        </div>
        <div className="col-6 col-md-3">
          <TextInput
            id="wi-planned-end"
            type="date"
            label="Planned end"
            registration={register('plannedEnd')}
            error={errors.plannedEnd}
          />
        </div>
        <div className="col-6 col-md-3">
          <TextInput
            id="wi-actual-start"
            type="date"
            label="Actual start"
            registration={register('actualStart')}
            error={errors.actualStart}
          />
        </div>
        <div className="col-6 col-md-3">
          <TextInput
            id="wi-actual-end"
            type="date"
            label="Actual end"
            registration={register('actualEnd')}
            error={errors.actualEnd}
          />
        </div>
      </div>
      <TextArea
        id="wi-dependency"
        label="Dependency"
        rows={2}
        registration={register('dependencyNote')}
        error={errors.dependencyNote}
      />
      <TextInput
        id="wi-evidence"
        label="Evidence / document reference"
        registration={register('evidenceRef')}
        error={errors.evidenceRef}
      />
      <TextArea
        id="wi-remarks"
        label="Remarks"
        rows={2}
        registration={register('remarks')}
        error={errors.remarks}
      />
      <FormActions
        cancelTo={cancelTo}
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create work item'}
      />
    </form>
  );
}

export function WorkItemCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const create = workItemsApi.useCreate(project.id);
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="New work item" />
      <WorkItemForm
        onSubmit={(values) => create.mutateAsync(values)}
        onDone={(saved) => void navigate(`../${saved.id}`, { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}

export function WorkItemEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = workItemsApi.useDetail(project.id, recordId);
  const update = workItemsApi.useUpdate(project.id, recordId);

  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="Edit work item" code={item.code} />
      <WorkItemForm
        key={item.version}
        item={item}
        onSubmit={(values) => update.mutateAsync(values as WorkItemUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}
