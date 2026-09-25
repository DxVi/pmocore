import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ReleaseCreateSchema,
  ReleaseUpdateSchema,
  type ReleaseCreate,
  type ReleaseCreateInput,
  type ReleaseDetail,
  type ReleaseUpdate,
} from '@pmocore/shared';
import { applyServerErrors, asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { useCurrentProject } from '@/features/projects/project-context';
import {
  ArchivedNotice,
  FormActions,
  FormError,
  RefSelect,
  TextArea,
  TextInput,
} from '@/features/plan/common/ui';
import { releasesApi } from './api';

type FormValues = ReleaseCreateInput & { version?: number };
const FIELDS = [
  'versionLabel',
  'name',
  'plannedDate',
  'releaseDate',
  'environmentId',
  'scope',
  'deploymentStatusId',
  'demoDate',
  'uatDate',
  'uatResultId',
  'deliveryDate',
  'trainingDate',
  'remarks',
] as const;

function toFormValues(item?: ReleaseDetail): FormValues {
  return {
    versionLabel: item?.versionLabel ?? '',
    name: item?.name ?? '',
    plannedDate: item?.plannedDate ?? '',
    releaseDate: item?.releaseDate ?? '',
    environmentId: item?.environmentId ?? null,
    scope: item?.scope ?? '',
    deploymentStatusId: item?.deploymentStatusId ?? null,
    demoDate: item?.demoDate ?? '',
    uatDate: item?.uatDate ?? '',
    uatResultId: item?.uatResultId ?? null,
    deliveryDate: item?.deliveryDate ?? '',
    trainingDate: item?.trainingDate ?? '',
    remarks: item?.remarks ?? '',
    version: item?.version,
  };
}

function ReleaseForm({
  item,
  onSubmit,
  onDone,
}: {
  item?: ReleaseDetail;
  onSubmit: (values: ReleaseCreate | ReleaseUpdate) => Promise<ReleaseDetail>;
  onDone: (item: ReleaseDetail) => void;
}) {
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
      isEdit ? ReleaseUpdateSchema : ReleaseCreateSchema,
    ) as unknown as Resolver<FormValues>,
  });
  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as ReleaseCreate | ReleaseUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });
  const refSelect = { setValueAs: asOptionalNumber };
  const dateField = (name: (typeof FIELDS)[number], label: string) => (
    <div className="col-6 col-md-4">
      <TextInput
        id={`rel-${name}`}
        type="date"
        label={label}
        registration={register(name)}
        error={errors[name]}
      />
    </div>
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      <FormError message={formError} />
      <div className="row">
        <div className="col-md-4">
          <TextInput
            id="rel-version"
            label="Version"
            required
            registration={register('versionLabel')}
            error={errors.versionLabel}
            hint="e.g. v1.0"
          />
        </div>
        <div className="col-md-8">
          <TextInput
            id="rel-name"
            label="Name"
            registration={register('name')}
            error={errors.name}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <RefSelect
            id="rel-env"
            label="Environment"
            category="ENVIRONMENT"
            currentId={item?.environmentId}
            registration={register('environmentId', refSelect)}
            error={errors.environmentId}
          />
        </div>
        <div className="col-md-4">
          <RefSelect
            id="rel-deploy"
            label="Deployment status"
            category="STATUS"
            currentId={item?.deploymentStatusId}
            registration={register('deploymentStatusId', refSelect)}
            error={errors.deploymentStatusId}
          />
        </div>
        <div className="col-md-4">
          <RefSelect
            id="rel-uat-result"
            label="UAT result"
            category="TEST_RESULT"
            currentId={item?.uatResultId}
            registration={register('uatResultId', refSelect)}
            error={errors.uatResultId}
          />
        </div>
      </div>
      <TextArea
        id="rel-scope"
        label="Release scope"
        registration={register('scope')}
        error={errors.scope}
      />
      <div className="row">
        {dateField('plannedDate', 'Planned date')}
        {dateField('releaseDate', 'Release date')}
        {dateField('demoDate', 'Demo date')}
        {dateField('uatDate', 'UAT date')}
        {dateField('deliveryDate', 'Delivery date')}
        {dateField('trainingDate', 'Training / turnover date')}
      </div>
      <TextArea
        id="rel-remarks"
        label="Remarks"
        rows={2}
        registration={register('remarks')}
        error={errors.remarks}
      />
      <FormActions
        cancelTo=".."
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create release'}
      />
    </form>
  );
}

export function ReleaseCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const create = releasesApi.useCreate(project.id);
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="New release" />
      <ReleaseForm
        onSubmit={(values) => create.mutateAsync(values)}
        onDone={(saved) => void navigate(`../${saved.id}`, { relative: 'path' })}
      />
    </>
  );
}

export function ReleaseEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = releasesApi.useDetail(project.id, recordId);
  const update = releasesApi.useUpdate(project.id, recordId);
  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="Edit release" code={item.code} />
      <ReleaseForm
        key={item.version}
        item={item}
        onSubmit={(values) => update.mutateAsync(values as ReleaseUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
      />
    </>
  );
}
