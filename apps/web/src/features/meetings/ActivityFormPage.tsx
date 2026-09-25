import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ActivityCreateSchema,
  ActivityUpdateSchema,
  type ActivityCreate,
  type ActivityCreateInput,
  type ActivityDetail,
  type ActivityUpdate,
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
import { useActivity, useCreateActivity, useUpdateActivity } from './api';

type FormValues = ActivityCreateInput & { version?: number };

const FIELDS = [
  'activityTypeId',
  'title',
  'activityDate',
  'startTime',
  'endTime',
  'modeId',
  'location',
  'endUsers',
  'attendees',
  'agenda',
  'findings',
  'outcomes',
  'todoSummary',
  'minutesRef',
  'statusId',
  'nextScheduleDate',
  'nextScheduleNote',
  'relatedRequirementId',
] as const;

const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

function toFormValues(
  activity: ActivityDetail | undefined,
  defaultStatusId: number | null,
): FormValues {
  return {
    activityTypeId: activity?.activityTypeId ?? null,
    title: activity?.title ?? '',
    activityDate: activity?.activityDate ?? localToday(),
    startTime: activity?.startTime?.slice(0, 5) ?? '',
    endTime: activity?.endTime?.slice(0, 5) ?? '',
    modeId: activity?.modeId ?? null,
    location: activity?.location ?? '',
    endUsers: activity?.endUsers ?? '',
    attendees: activity?.attendees ?? '',
    agenda: activity?.agenda ?? '',
    findings: activity?.findings ?? '',
    outcomes: activity?.outcomes ?? '',
    todoSummary: activity?.todoSummary ?? '',
    minutesRef: activity?.minutesRef ?? '',
    // Fields without an editor in this form round-trip unchanged (full-replacement updates).
    minutesDocumentId: activity?.minutesDocumentId ?? null,
    previousActivityId: activity?.previousActivityId ?? null,
    statusId: activity ? activity.statusId : defaultStatusId,
    nextScheduleDate: activity?.nextScheduleDate ?? '',
    nextScheduleNote: activity?.nextScheduleNote ?? '',
    relatedRequirementId: activity?.relatedRequirementId ?? null,
    version: activity?.version,
  };
}

type FormProps = {
  activity?: ActivityDetail;
  onSubmit: (values: ActivityCreate | ActivityUpdate) => Promise<ActivityDetail>;
  onDone: (activity: ActivityDetail) => void;
  cancelTo: string;
};

function ActivityForm({ activity, onSubmit, onDone, cancelTo }: FormProps) {
  const project = useCurrentProject();
  const { options } = useReferenceData();
  const hasModes = useHasReferenceValues('ACTIVITY_MODE');
  const defaultStatus = options('STATUS').find((v) => v.code === 'NOT_STARTED')?.id ?? null;
  const [formError, setFormError] = useState<string>();
  const [requirement, setRequirement] = useState<RecordRef | null>(
    activity?.relatedRequirement ?? null,
  );
  const isEdit = Boolean(activity);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: toFormValues(activity, defaultStatus),
    resolver: zodResolver(
      isEdit ? ActivityUpdateSchema : ActivityCreateSchema,
    ) as unknown as Resolver<FormValues>,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as ActivityCreate | ActivityUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  const control = (name: (typeof FIELDS)[number]) =>
    `form-control ${errors[name] ? 'is-invalid' : ''}`;
  const textArea = (name: (typeof FIELDS)[number], label: string, rows = 3, hint?: string) => (
    <Field id={`activity-${name}`} label={label} error={errors[name]} hint={hint}>
      <textarea id={`activity-${name}`} rows={rows} className={control(name)} {...register(name)} />
    </Field>
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      {formError && (
        <div className="alert alert-danger" role="alert">
          {formError}
        </div>
      )}

      <fieldset className="mb-2">
        <legend className="h6 text-secondary">Basics</legend>
        <div className="row">
          <div className="col-md-4">
            <Field id="activity-type" label="Type" error={errors.activityTypeId}>
              <select
                id="activity-type"
                className="form-select"
                {...register('activityTypeId', { setValueAs: asOptionalNumber })}
              >
                <RefOptions category="ACTIVITY_TYPE" currentId={activity?.activityTypeId} />
              </select>
            </Field>
          </div>
          <div className="col-md-8">
            <Field id="activity-title" label="Title" required error={errors.title}>
              <input id="activity-title" className={control('title')} {...register('title')} />
            </Field>
          </div>
        </div>
        <div className="row">
          <div className="col-12 col-sm-4">
            <Field id="activity-date" label="Date" required error={errors.activityDate}>
              <input
                id="activity-date"
                type="date"
                className={control('activityDate')}
                {...register('activityDate')}
              />
            </Field>
          </div>
          <div className="col-6 col-sm-4">
            <Field id="activity-start" label="Start time" error={errors.startTime}>
              <input
                id="activity-start"
                type="time"
                className={control('startTime')}
                {...register('startTime')}
              />
            </Field>
          </div>
          <div className="col-6 col-sm-4">
            <Field id="activity-end" label="End time" error={errors.endTime}>
              <input
                id="activity-end"
                type="time"
                className={control('endTime')}
                {...register('endTime')}
              />
            </Field>
          </div>
        </div>
        <div className="row">
          <div className="col-md-4">
            <Field id="activity-status" label="Status" error={errors.statusId}>
              <select
                id="activity-status"
                className="form-select"
                {...register('statusId', { setValueAs: asOptionalNumber })}
              >
                <RefOptions category="STATUS" currentId={activity?.statusId} />
              </select>
            </Field>
          </div>
          {hasModes && (
            <div className="col-md-4">
              <Field id="activity-mode" label="Mode" error={errors.modeId}>
                <select
                  id="activity-mode"
                  className="form-select"
                  {...register('modeId', { setValueAs: asOptionalNumber })}
                >
                  <RefOptions category="ACTIVITY_MODE" currentId={activity?.modeId} />
                </select>
              </Field>
            </div>
          )}
          <div className={hasModes ? 'col-md-4' : 'col-md-8'}>
            <Field
              id="activity-location"
              label="Location or mode"
              error={errors.location}
              hint="e.g. Registrar's Office, or Online (Teams)"
            >
              <input
                id="activity-location"
                className={control('location')}
                {...register('location')}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="mb-2">
        <legend className="h6 text-secondary">People</legend>
        <div className="row">
          <div className="col-md-6">{textArea('endUsers', 'End users', 2, 'One per line')}</div>
          <div className="col-md-6">{textArea('attendees', 'Attendees', 2, 'One per line')}</div>
        </div>
      </fieldset>

      <fieldset className="mb-2">
        <legend className="h6 text-secondary">Content</legend>
        {textArea('agenda', 'Agenda')}
        {textArea('findings', 'Discussion / findings', 4)}
        {textArea('outcomes', 'Outcomes / decisions', 3)}
        {textArea('todoSummary', 'To-do summary', 2)}
      </fieldset>

      <fieldset className="mb-2">
        <legend className="h6 text-secondary">Next schedule</legend>
        <div className="row">
          <div className="col-sm-4">
            <Field
              id="activity-next-date"
              label="Next schedule date"
              error={errors.nextScheduleDate}
            >
              <input
                id="activity-next-date"
                type="date"
                className={control('nextScheduleDate')}
                {...register('nextScheduleDate')}
              />
            </Field>
          </div>
          <div className="col-sm-8">
            <Field
              id="activity-next-note"
              label="Next schedule note"
              error={errors.nextScheduleNote}
            >
              <input
                id="activity-next-note"
                className={control('nextScheduleNote')}
                {...register('nextScheduleNote')}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="mb-2">
        <legend className="h6 text-secondary">References</legend>
        <RecordPicker
          projectId={project.id}
          type="requirement"
          label="Related requirement"
          value={requirement}
          error={errors.relatedRequirementId?.message}
          onChange={(value) => {
            setRequirement(value);
            setValue('relatedRequirementId', value?.id ?? null, { shouldDirty: true });
          }}
        />
        <Field id="activity-minutes" label="Minutes / document reference" error={errors.minutesRef}>
          <input
            id="activity-minutes"
            className={control('minutesRef')}
            {...register('minutesRef')}
          />
        </Field>
      </fieldset>

      <div className="d-flex flex-column-reverse flex-sm-row gap-2 justify-content-sm-end pmo-form-actions">
        <Link to={cancelTo} relative="path" className="btn btn-outline-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          )}
          {isEdit ? 'Save changes' : 'Save and add attachments'}
        </button>
      </div>
    </form>
  );
}

export function ActivityCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const references = useReferenceData();
  const create = useCreateActivity(project.id);

  if (project.archivedAt) {
    return <div className="alert alert-secondary">This project is archived and read-only.</div>;
  }
  // Defaults (e.g. status "Not Started") come from reference data: wait for it.
  if (references.isLoading) return <LoadingState />;
  return (
    <>
      <PageHeader title="New meeting / visit" />
      <ActivityForm
        key={references.dataUpdatedAt}
        onSubmit={(values) => create.mutateAsync(values)}
        // Open the saved record with Attachments in view: capture is one tap away (design §9.3).
        onDone={(saved) => void navigate(`../${saved.id}#attachments`, { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}

export function ActivityEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: activity, isLoading, error, refetch } = useActivity(project.id, recordId);
  const update = useUpdateActivity(project.id, recordId);

  if (isLoading) return <LoadingState />;
  if (error || !activity) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) {
    return <div className="alert alert-secondary">This project is archived and read-only.</div>;
  }
  return (
    <>
      <PageHeader title="Edit meeting / visit" code={activity.code} />
      <ActivityForm
        key={activity.version}
        activity={activity}
        onSubmit={(values) => update.mutateAsync(values as ActivityUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}
