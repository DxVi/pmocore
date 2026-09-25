import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DocumentCreateSchema,
  DocumentUpdateSchema,
  type DocumentCreate,
  type DocumentCreateInput,
  type DocumentDetail,
  type DocumentUpdate,
  type LookupType,
  type RecordRef,
} from '@pmocore/shared';
import { applyServerErrors, asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { RecordPicker } from '@/components/RecordPicker';
import { useHasReferenceValues } from '@/hooks/useReferenceData';
import { useCurrentProject } from '@/features/projects/project-context';
import {
  ArchivedNotice,
  FormActions,
  FormError,
  RefSelect,
  TextArea,
  TextInput,
} from '@/features/plan/common/ui';
import { documentsApi } from './api';

type FormValues = DocumentCreateInput & { version?: number };
type RelatedType = 'requirement' | 'activity' | 'release' | 'workItem';

const RELATED: Record<RelatedType, { label: string; lookup: LookupType; field: RelatedField }> = {
  requirement: { label: 'Requirement', lookup: 'requirement', field: 'relatedRequirementId' },
  activity: { label: 'Meeting / visit', lookup: 'activity', field: 'relatedActivityId' },
  release: { label: 'Release', lookup: 'release', field: 'relatedReleaseId' },
  workItem: { label: 'Work item', lookup: 'work-item', field: 'relatedWorkItemId' },
};
type RelatedField =
  'relatedRequirementId' | 'relatedActivityId' | 'relatedReleaseId' | 'relatedWorkItemId';
const RELATED_FIELDS: RelatedField[] = [
  'relatedRequirementId',
  'relatedActivityId',
  'relatedReleaseId',
  'relatedWorkItemId',
];

const FIELDS = [
  'phaseId',
  'documentTypeId',
  'title',
  'docVersion',
  'ownerName',
  'documentDate',
  'statusId',
  'linkUrl',
  'remarks',
  ...RELATED_FIELDS,
] as const;

function toFormValues(item?: DocumentDetail): FormValues {
  return {
    phaseId: item?.phaseId ?? null,
    documentTypeId: item?.documentTypeId ?? null,
    title: item?.title ?? '',
    docVersion: item?.docVersion ?? '',
    ownerName: item?.ownerName ?? '',
    documentDate: item?.documentDate ?? '',
    statusId: item?.statusId ?? null,
    linkUrl: item?.linkUrl ?? '',
    relatedRequirementId: item?.relatedRequirementId ?? null,
    relatedActivityId: item?.relatedActivityId ?? null,
    relatedReleaseId: item?.relatedReleaseId ?? null,
    relatedWorkItemId: item?.relatedWorkItemId ?? null,
    remarks: item?.remarks ?? '',
    version: item?.version,
  };
}

function DocumentForm({
  item,
  onSubmit,
  onDone,
}: {
  item?: DocumentDetail;
  onSubmit: (values: DocumentCreate | DocumentUpdate) => Promise<DocumentDetail>;
  onDone: (item: DocumentDetail) => void;
}) {
  const project = useCurrentProject();
  const hasTypes = useHasReferenceValues('DOCUMENT_TYPE');
  const [formError, setFormError] = useState<string>();
  const [relatedType, setRelatedType] = useState<RelatedType | ''>(item?.relatedRecord?.type ?? '');
  const [related, setRelated] = useState<RecordRef | null>(item?.relatedRecord ?? null);
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
      isEdit ? DocumentUpdateSchema : DocumentCreateSchema,
    ) as unknown as Resolver<FormValues>,
  });

  // Exactly one related record type is kept; the others are cleared.
  const setRelatedRecord = (type: RelatedType | '', value: RecordRef | null) => {
    for (const field of RELATED_FIELDS) setValue(field, null, { shouldDirty: true });
    if (type && value) setValue(RELATED[type].field, value.id, { shouldDirty: true });
    setRelated(value);
  };

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as DocumentCreate | DocumentUpdate));
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
            id="doc-title"
            label="Title"
            required
            registration={register('title')}
            error={errors.title}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id="doc-version"
            label="Version"
            registration={register('docVersion')}
            error={errors.docVersion}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <RefSelect
            id="doc-phase"
            label="Phase"
            category="PROJECT_PHASE"
            currentId={item?.phaseId}
            registration={register('phaseId', refSelect)}
            error={errors.phaseId}
          />
        </div>
        {hasTypes && (
          <div className="col-md-4">
            <RefSelect
              id="doc-type"
              label="Document type"
              category="DOCUMENT_TYPE"
              currentId={item?.documentTypeId}
              registration={register('documentTypeId', refSelect)}
              error={errors.documentTypeId}
            />
          </div>
        )}
        <div className="col-md-4">
          <RefSelect
            id="doc-status"
            label="Status"
            category="STATUS"
            currentId={item?.statusId}
            registration={register('statusId', refSelect)}
            error={errors.statusId}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <TextInput
            id="doc-owner"
            label="Owner"
            registration={register('ownerName')}
            error={errors.ownerName}
          />
        </div>
        <div className="col-md-6">
          <TextInput
            id="doc-date"
            type="date"
            label="Document date"
            registration={register('documentDate')}
            error={errors.documentDate}
          />
        </div>
      </div>
      <TextInput
        id="doc-link"
        type="url"
        label="External link"
        hint="https:// link to the file in shared storage (optional; files can also be attached after saving)"
        registration={register('linkUrl')}
        error={errors.linkUrl}
      />
      <fieldset className="mb-2">
        <legend className="h6 text-secondary">Related record</legend>
        <div className="mb-3">
          <label htmlFor="doc-related-type" className="form-label fw-medium">
            Related to
          </label>
          <select
            id="doc-related-type"
            className="form-select"
            value={relatedType}
            onChange={(event) => {
              const type = event.target.value as RelatedType | '';
              setRelatedType(type);
              setRelatedRecord(type, null);
            }}
          >
            <option value="">Nothing</option>
            {(Object.keys(RELATED) as RelatedType[]).map((type) => (
              <option key={type} value={type}>
                {RELATED[type].label}
              </option>
            ))}
          </select>
        </div>
        {relatedType && (
          <RecordPicker
            key={relatedType}
            projectId={project.id}
            type={RELATED[relatedType].lookup}
            label={RELATED[relatedType].label}
            value={related}
            error={
              errors[RELATED[relatedType].field]?.message ?? errors.relatedRequirementId?.message
            }
            onChange={(value) => setRelatedRecord(relatedType, value)}
          />
        )}
      </fieldset>
      <TextArea
        id="doc-remarks"
        label="Remarks"
        rows={2}
        registration={register('remarks')}
        error={errors.remarks}
      />
      <FormActions
        cancelTo=".."
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Save and add files'}
      />
    </form>
  );
}

export function DocumentCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const create = documentsApi.useCreate(project.id);
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="New document" />
      <DocumentForm
        onSubmit={(values) => create.mutateAsync(values)}
        onDone={(saved) => void navigate(`../${saved.id}`, { relative: 'path' })}
      />
    </>
  );
}

export function DocumentEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = documentsApi.useDetail(project.id, recordId);
  const update = documentsApi.useUpdate(project.id, recordId);
  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="Edit document" code={item.code} />
      <DocumentForm
        key={item.version}
        item={item}
        onSubmit={(values) => update.mutateAsync(values as DocumentUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
      />
    </>
  );
}
