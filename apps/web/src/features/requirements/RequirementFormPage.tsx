import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  RequirementCreateSchema,
  RequirementUpdateSchema,
  type RecordRef,
  type RequirementCreate,
  type RequirementCreateInput,
  type RequirementDetail,
  type RequirementUpdate,
} from '@pmocore/shared';
import { applyServerErrors, asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { RecordPicker } from '@/components/RecordPicker';
import { useHasReferenceValues } from '@/hooks/useReferenceData';
import { useCurrentProject } from '@/features/projects/project-context';
import { localToday } from '@/features/plan/common/record-api';
import {
  ArchivedNotice,
  FormActions,
  FormError,
  RefSelect,
  TextArea,
  TextInput,
} from '@/features/plan/common/ui';
import { requirementsApi } from './api';

type FormValues = RequirementCreateInput & { version?: number };

const FIELDS = [
  'module',
  'dateRaised',
  'source',
  'statement',
  'acceptanceCriteria',
  'requirementTypeId',
  'priorityId',
  'assigneeName',
  'statusId',
  'targetReleaseId',
  'isChangeRequest',
  'validationEvidence',
  'remarks',
] as const;

function toFormValues(item?: RequirementDetail): FormValues {
  return {
    module: item?.module ?? '',
    dateRaised: item?.dateRaised ?? localToday(),
    source: item?.source ?? '',
    statement: item?.statement ?? '',
    acceptanceCriteria: item?.acceptanceCriteria ?? '',
    requirementTypeId: item?.requirementTypeId ?? null,
    priorityId: item?.priorityId ?? null,
    assigneeName: item?.assigneeName ?? '',
    statusId: item?.statusId ?? null,
    targetReleaseId: item?.targetReleaseId ?? null,
    isChangeRequest: item?.isChangeRequest ?? false,
    // No editor here yet: preserved unchanged on update (full-replacement PUT).
    changeRequestRaidId: item?.changeRequestRaidId ?? null,
    validationEvidence: item?.validationEvidence ?? '',
    remarks: item?.remarks ?? '',
    version: item?.version,
  };
}

type FormProps = {
  item?: RequirementDetail;
  onSubmit: (values: RequirementCreate | RequirementUpdate) => Promise<RequirementDetail>;
  onDone: (item: RequirementDetail) => void;
  cancelTo: string;
};

function RequirementForm({ item, onSubmit, onDone, cancelTo }: FormProps) {
  const project = useCurrentProject();
  const hasTypes = useHasReferenceValues('REQUIREMENT_TYPE');
  const [formError, setFormError] = useState<string>();
  const [targetRelease, setTargetRelease] = useState<RecordRef | null>(item?.targetRelease ?? null);
  const isEdit = Boolean(item);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: toFormValues(item),
    resolver: zodResolver(
      isEdit ? RequirementUpdateSchema : RequirementCreateSchema,
    ) as unknown as Resolver<FormValues>,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as RequirementCreate | RequirementUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });
  const refSelect = { setValueAs: asOptionalNumber };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      <FormError message={formError} />
      <TextArea
        id="req-statement"
        label="Requirement statement"
        required
        rows={3}
        registration={register('statement')}
        error={errors.statement}
      />
      <TextArea
        id="req-criteria"
        label="Acceptance criteria"
        rows={3}
        registration={register('acceptanceCriteria')}
        error={errors.acceptanceCriteria}
      />
      <div className="row">
        <div className="col-md-4">
          <TextInput
            id="req-module"
            label="Module"
            registration={register('module')}
            error={errors.module}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id="req-source"
            label="Source / end user"
            registration={register('source')}
            error={errors.source}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id="req-raised"
            type="date"
            label="Date raised"
            registration={register('dateRaised')}
            error={errors.dateRaised}
          />
        </div>
      </div>
      <div className="row">
        {hasTypes && (
          <div className="col-md-3">
            <RefSelect
              id="req-type"
              label="Type"
              category="REQUIREMENT_TYPE"
              currentId={item?.requirementTypeId}
              registration={register('requirementTypeId', refSelect)}
              error={errors.requirementTypeId}
            />
          </div>
        )}
        <div className="col-md-3">
          <RefSelect
            id="req-priority"
            label="Priority"
            category="PRIORITY"
            currentId={item?.priorityId}
            registration={register('priorityId', refSelect)}
            error={errors.priorityId}
          />
        </div>
        <div className="col-md-3">
          <RefSelect
            id="req-status"
            label="Status"
            category="STATUS"
            currentId={item?.statusId}
            registration={register('statusId', refSelect)}
            error={errors.statusId}
          />
        </div>
        <div className="col-md-3">
          <TextInput
            id="req-assignee"
            label="Assignee"
            registration={register('assigneeName')}
            error={errors.assigneeName}
          />
        </div>
      </div>
      <RecordPicker
        projectId={project.id}
        type="release"
        label="Target release"
        value={targetRelease}
        error={errors.targetReleaseId?.message}
        onChange={(value) => {
          setTargetRelease(value);
          setValue('targetReleaseId', value?.id ?? null, { shouldDirty: true });
        }}
      />
      <div className="form-check mb-3">
        <input
          id="req-cr"
          type="checkbox"
          className="form-check-input"
          {...register('isChangeRequest')}
        />
        <label htmlFor="req-cr" className="form-check-label">
          Change request
        </label>
      </div>
      <TextArea
        id="req-evidence"
        label="Validation / evidence"
        rows={2}
        registration={register('validationEvidence')}
        error={errors.validationEvidence}
      />
      <TextArea
        id="req-remarks"
        label="Remarks"
        rows={2}
        registration={register('remarks')}
        error={errors.remarks}
      />
      <FormActions
        cancelTo={cancelTo}
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create requirement'}
      />
    </form>
  );
}

export function RequirementCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const create = requirementsApi.useCreate(project.id);
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="New requirement" />
      <RequirementForm
        onSubmit={(values) => create.mutateAsync(values)}
        onDone={(saved) => void navigate(`../${saved.id}`, { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}

export function RequirementEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = requirementsApi.useDetail(project.id, recordId);
  const update = requirementsApi.useUpdate(project.id, recordId);
  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="Edit requirement" code={item.code} />
      <RequirementForm
        key={item.version}
        item={item}
        onSubmit={(values) => update.mutateAsync(values as RequirementUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
        cancelTo=".."
      />
    </>
  );
}
