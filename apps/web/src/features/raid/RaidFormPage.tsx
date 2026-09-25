import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  RaidItemCreateSchema,
  RaidItemUpdateSchema,
  type RaidItemCreate,
  type RaidItemCreateInput,
  type RaidItemDetail,
  type RaidItemUpdate,
  type RecordRef,
} from '@pmocore/shared';
import { Field } from '@/components/form/Field';
import { applyServerErrors, asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { RecordPicker } from '@/components/RecordPicker';
import { RefOptions } from '@/components/RefOptions';
import { useHasReferenceValues, useReferenceData } from '@/hooks/useReferenceData';
import { useCurrentProject } from '@/features/projects/project-context';
import { useCreateRaidItem, useRaidItem, useUpdateRaidItem } from './api';

type FormValues = RaidItemCreateInput & { version?: number };

const FIELDS = [
  'typeId',
  'title',
  'description',
  'impact',
  'ownerName',
  'dateRaised',
  'sourceActivityId',
  'probabilityId',
  'priorityId',
  'dueDate',
  'statusId',
  'mitigation',
  'resolution',
  'closedDate',
  'evidence',
  'remarks',
  'requirementId',
  'releaseId',
] as const;

const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

function toFormValues(
  item: RaidItemDetail | undefined,
  defaults: { typeId: number | undefined; statusId: number | null },
): FormValues {
  return {
    typeId: item?.typeId ?? (defaults.typeId as number),
    title: item?.title ?? '',
    description: item?.description ?? '',
    impact: item?.impact ?? '',
    ownerName: item?.ownerName ?? '',
    dateRaised: item?.dateRaised ?? localToday(),
    sourceActivityId: item?.sourceActivityId ?? null,
    probabilityId: item?.probabilityId ?? null,
    priorityId: item?.priorityId ?? null,
    dueDate: item?.dueDate ?? '',
    statusId: item ? item.statusId : defaults.statusId,
    mitigation: item?.mitigation ?? '',
    resolution: item?.resolution ?? '',
    closedDate: item?.closedDate ?? '',
    evidence: item?.evidence ?? '',
    remarks: item?.remarks ?? '',
    requirementId: item?.requirementId ?? null,
    releaseId: item?.releaseId ?? null,
    version: item?.version,
  };
}

type FormProps = {
  item?: RaidItemDetail;
  onSubmit: (values: RaidItemCreate | RaidItemUpdate) => Promise<RaidItemDetail>;
  onDone: (item: RaidItemDetail) => void;
  cancelTo: string;
};

function RaidForm({ item, onSubmit, onDone, cancelTo }: FormProps) {
  const project = useCurrentProject();
  const { options } = useReferenceData();
  const hasProbability = useHasReferenceValues('PROBABILITY');
  const [formError, setFormError] = useState<string>();
  const [sourceActivity, setSourceActivity] = useState<RecordRef | null>(
    item?.sourceActivity ?? null,
  );
  const [requirement, setRequirement] = useState<RecordRef | null>(item?.requirement ?? null);
  const [release, setRelease] = useState<RecordRef | null>(item?.release ?? null);
  const isEdit = Boolean(item);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: toFormValues(item, {
      typeId: options('RAID_TYPE').find((v) => v.code === 'ACTION')?.id,
      statusId: options('STATUS').find((v) => v.code === 'NOT_STARTED')?.id ?? null,
    }),
    resolver: zodResolver(
      isEdit ? RaidItemUpdateSchema : RaidItemCreateSchema,
    ) as unknown as Resolver<FormValues>,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as RaidItemCreate | RaidItemUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  const control = (name: (typeof FIELDS)[number]) =>
    `form-control ${errors[name] ? 'is-invalid' : ''}`;
  const textArea = (name: (typeof FIELDS)[number], label: string, rows = 2) => (
    <Field id={`raid-${name}`} label={label} error={errors[name]}>
      <textarea id={`raid-${name}`} rows={rows} className={control(name)} {...register(name)} />
    </Field>
  );
  const select = (
    name: 'typeId' | 'statusId' | 'priorityId' | 'probabilityId',
    label: string,
    category: 'RAID_TYPE' | 'STATUS' | 'PRIORITY' | 'PROBABILITY',
    required = false,
  ) => (
    <Field id={`raid-${name}`} label={label} required={required} error={errors[name]}>
      <select
        id={`raid-${name}`}
        className="form-select"
        {...register(name, { setValueAs: asOptionalNumber })}
      >
        <RefOptions category={category} currentId={item?.[name]} />
      </select>
    </Field>
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      {formError && (
        <div className="alert alert-danger" role="alert">
          {formError}
        </div>
      )}
      <div className="row">
        <div className="col-md-4">{select('typeId', 'Type', 'RAID_TYPE', true)}</div>
        <div className="col-md-8">
          <Field id="raid-title" label="Title" required error={errors.title}>
            <input id="raid-title" className={control('title')} {...register('title')} />
          </Field>
        </div>
      </div>
      {textArea('description', 'Description', 3)}
      {textArea('impact', 'Impact')}
      <div className="row">
        <div className="col-md-4">
          <Field id="raid-owner" label="Owner" error={errors.ownerName}>
            <input id="raid-owner" className={control('ownerName')} {...register('ownerName')} />
          </Field>
        </div>
        <div className="col-6 col-md-4">
          <Field id="raid-raised" label="Date raised" required error={errors.dateRaised}>
            <input
              id="raid-raised"
              type="date"
              className={control('dateRaised')}
              {...register('dateRaised')}
            />
          </Field>
        </div>
        <div className="col-6 col-md-4">
          <Field id="raid-due" label="Due date" error={errors.dueDate}>
            <input
              id="raid-due"
              type="date"
              className={control('dueDate')}
              {...register('dueDate')}
            />
          </Field>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">{select('statusId', 'Status', 'STATUS')}</div>
        <div className="col-md-4">{select('priorityId', 'Severity / priority', 'PRIORITY')}</div>
        {hasProbability && (
          <div className="col-md-4">{select('probabilityId', 'Probability', 'PROBABILITY')}</div>
        )}
      </div>
      {textArea('mitigation', 'Mitigation / required action')}
      {textArea('resolution', 'Decision / resolution')}
      <div className="row">
        <div className="col-sm-4">
          <Field
            id="raid-closed"
            label="Closed date"
            error={errors.closedDate}
            hint="Filled automatically when the status is completed or inactive."
          >
            <input
              id="raid-closed"
              type="date"
              className={control('closedDate')}
              {...register('closedDate')}
            />
          </Field>
        </div>
        <div className="col-sm-8">
          <Field id="raid-evidence" label="Evidence" error={errors.evidence}>
            <input id="raid-evidence" className={control('evidence')} {...register('evidence')} />
          </Field>
        </div>
      </div>
      {textArea('remarks', 'Remarks')}

      <fieldset className="mb-2">
        <legend className="h6 text-secondary">Related records</legend>
        <RecordPicker
          projectId={project.id}
          type="activity"
          label="Source meeting / visit"
          value={sourceActivity}
          error={errors.sourceActivityId?.message}
          onChange={(value) => {
            setSourceActivity(value);
            setValue('sourceActivityId', value?.id ?? null, { shouldDirty: true });
          }}
        />
        <RecordPicker
          projectId={project.id}
          type="requirement"
          label="Requirement"
          value={requirement}
          error={errors.requirementId?.message}
          onChange={(value) => {
            setRequirement(value);
            setValue('requirementId', value?.id ?? null, { shouldDirty: true });
          }}
        />
        <RecordPicker
          projectId={project.id}
          type="release"
          label="Release"
          value={release}
          error={errors.releaseId?.message}
          onChange={(value) => {
            setRelease(value);
            setValue('releaseId', value?.id ?? null, { shouldDirty: true });
          }}
        />
      </fieldset>

      <div className="d-flex flex-column-reverse flex-sm-row gap-2 justify-content-sm-end pmo-form-actions">
        <Link to={cancelTo} relative="path" className="btn btn-outline-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          )}
          {isEdit ? 'Save changes' : 'Create item'}
        </button>
      </div>
    </form>
  );
}

export function RaidCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const references = useReferenceData();
  const create = useCreateRaidItem(project.id);
  if (project.archivedAt) {
    return <div className="alert alert-secondary">This project is archived and read-only.</div>;
  }
  // Defaults (e.g. status "Not Started") come from reference data: wait for it.
  if (references.isLoading) return <LoadingState />;
  return (
    <>
      <PageHeader title="New action / RAID item" />
      <RaidForm
        key={references.dataUpdatedAt}
        onSubmit={(values) => create.mutateAsync(values)}
        onDone={(saved) => void navigate(`../${saved.id}`, { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}

export function RaidEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = useRaidItem(project.id, recordId);
  const update = useUpdateRaidItem(project.id, recordId);

  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) {
    return <div className="alert alert-secondary">This project is archived and read-only.</div>;
  }
  return (
    <>
      <PageHeader title="Edit item" code={item.code} />
      <RaidForm
        key={item.version}
        item={item}
        onSubmit={(values) => update.mutateAsync(values as RaidItemUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}
