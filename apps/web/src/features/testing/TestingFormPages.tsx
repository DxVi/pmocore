import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  DefectCreateSchema,
  DefectUpdateSchema,
  TestCaseCreateSchema,
  TestCaseUpdateSchema,
  type DefectCreate,
  type DefectCreateInput,
  type DefectDetail,
  type DefectUpdate,
  type RecordRef,
  type TestCaseCreate,
  type TestCaseCreateInput,
  type TestCaseDetail,
  type TestCaseUpdate,
} from '@pmocore/shared';
import { applyServerErrors, asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { RecordPicker } from '@/components/RecordPicker';
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
import { defectsApi, testsApi } from './api';

const refSelect = { setValueAs: asOptionalNumber };

// ---------------------------------------------------------------------------
// Test cases (latest result only — SA-2)
// ---------------------------------------------------------------------------

type TestValues = TestCaseCreateInput & { version?: number };
const TEST_FIELDS = [
  'module',
  'requirementId',
  'stageId',
  'scenario',
  'expectedResult',
  'actualResult',
  'testerName',
  'testDate',
  'resultId',
  'statusId',
  'evidence',
  'remarks',
] as const;

function toTestValues(item?: TestCaseDetail): TestValues {
  return {
    module: item?.module ?? '',
    requirementId: item?.requirementId ?? null,
    stageId: item?.stageId ?? null,
    scenario: item?.scenario ?? '',
    expectedResult: item?.expectedResult ?? '',
    actualResult: item?.actualResult ?? '',
    testerName: item?.testerName ?? '',
    testDate: item?.testDate ?? localToday(),
    resultId: item?.resultId ?? null,
    statusId: item?.statusId ?? null,
    evidence: item?.evidence ?? '',
    remarks: item?.remarks ?? '',
    version: item?.version,
  };
}

function TestCaseForm({
  item,
  onSubmit,
  onDone,
  cancelTo,
}: {
  cancelTo: string;
  item?: TestCaseDetail;
  onSubmit: (values: TestCaseCreate | TestCaseUpdate) => Promise<TestCaseDetail>;
  onDone: (item: TestCaseDetail) => void;
}) {
  const project = useCurrentProject();
  const [formError, setFormError] = useState<string>();
  const [requirement, setRequirement] = useState<RecordRef | null>(item?.requirement ?? null);
  const isEdit = Boolean(item);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TestValues>({
    defaultValues: toTestValues(item),
    resolver: zodResolver(
      isEdit ? TestCaseUpdateSchema : TestCaseCreateSchema,
    ) as unknown as Resolver<TestValues>,
  });
  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as TestCaseCreate | TestCaseUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, TEST_FIELDS));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      <FormError message={formError} />
      <TextArea
        id="tc-scenario"
        label="Scenario"
        required
        registration={register('scenario')}
        error={errors.scenario}
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
      <div className="row">
        <div className="col-md-4">
          <RefSelect
            id="tc-stage"
            label="Test stage"
            category="TEST_STAGE"
            currentId={item?.stageId}
            registration={register('stageId', refSelect)}
            error={errors.stageId}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id="tc-module"
            label="Module"
            registration={register('module')}
            error={errors.module}
          />
        </div>
        <div className="col-md-4">
          <RefSelect
            id="tc-status"
            label="Status"
            category="STATUS"
            currentId={item?.statusId}
            registration={register('statusId', refSelect)}
            error={errors.statusId}
          />
        </div>
      </div>
      <TextArea
        id="tc-expected"
        label="Expected result"
        rows={2}
        registration={register('expectedResult')}
        error={errors.expectedResult}
      />
      <TextArea
        id="tc-actual"
        label="Actual result (latest)"
        rows={2}
        registration={register('actualResult')}
        error={errors.actualResult}
      />
      <div className="row">
        <div className="col-md-4">
          <RefSelect
            id="tc-result"
            label="Latest result"
            category="TEST_RESULT"
            currentId={item?.resultId}
            emptyLabel="Not run"
            registration={register('resultId', refSelect)}
            error={errors.resultId}
          />
        </div>
        <div className="col-6 col-md-4">
          <TextInput
            id="tc-tester"
            label="Tester"
            registration={register('testerName')}
            error={errors.testerName}
          />
        </div>
        <div className="col-6 col-md-4">
          <TextInput
            id="tc-date"
            type="date"
            label="Test date"
            registration={register('testDate')}
            error={errors.testDate}
          />
        </div>
      </div>
      <TextInput
        id="tc-evidence"
        label="Evidence"
        registration={register('evidence')}
        error={errors.evidence}
      />
      <TextArea
        id="tc-remarks"
        label="Remarks"
        rows={2}
        registration={register('remarks')}
        error={errors.remarks}
      />
      <FormActions
        cancelTo={cancelTo}
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create test case'}
      />
    </form>
  );
}

export function TestCaseCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const create = testsApi.useCreate(project.id);
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="New test case" />
      <TestCaseForm
        cancelTo="../.."
        onSubmit={(values) => create.mutateAsync(values)}
        onDone={(saved) => void navigate(`../${saved.id}`, { relative: 'path' })}
      />
    </>
  );
}

export function TestCaseEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = testsApi.useDetail(project.id, recordId);
  const update = testsApi.useUpdate(project.id, recordId);
  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="Edit test case" code={item.code} />
      <TestCaseForm
        key={item.version}
        item={item}
        cancelTo=".."
        onSubmit={(values) => update.mutateAsync(values as TestCaseUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Defects (with retest tracking)
// ---------------------------------------------------------------------------

type DefectValues = DefectCreateInput & { version?: number };
const DEFECT_FIELDS = [
  'testCaseId',
  'externalRef',
  'title',
  'description',
  'severityId',
  'assigneeName',
  'statusId',
  'targetFixDate',
  'targetFixReleaseId',
  'retestDate',
  'retestResultId',
  'remarks',
] as const;

function toDefectValues(item?: DefectDetail, testCaseId?: string | null): DefectValues {
  return {
    testCaseId: item?.testCaseId ?? testCaseId ?? null,
    externalRef: item?.externalRef ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    severityId: item?.severityId ?? null,
    assigneeName: item?.assigneeName ?? '',
    statusId: item?.statusId ?? null,
    targetFixDate: item?.targetFixDate ?? '',
    targetFixReleaseId: item?.targetFixReleaseId ?? null,
    retestDate: item?.retestDate ?? '',
    retestResultId: item?.retestResultId ?? null,
    remarks: item?.remarks ?? '',
    version: item?.version,
  };
}

function DefectForm({
  item,
  initialTestCase,
  onSubmit,
  onDone,
  cancelTo,
}: {
  cancelTo: string;
  item?: DefectDetail;
  initialTestCase?: RecordRef | null;
  onSubmit: (values: DefectCreate | DefectUpdate) => Promise<DefectDetail>;
  onDone: (item: DefectDetail) => void;
}) {
  const project = useCurrentProject();
  const [formError, setFormError] = useState<string>();
  const [testCase, setTestCase] = useState<RecordRef | null>(
    item?.testCase ?? initialTestCase ?? null,
  );
  const [fixRelease, setFixRelease] = useState<RecordRef | null>(item?.targetFixRelease ?? null);
  const isEdit = Boolean(item);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DefectValues>({
    defaultValues: toDefectValues(item, initialTestCase?.id),
    resolver: zodResolver(
      isEdit ? DefectUpdateSchema : DefectCreateSchema,
    ) as unknown as Resolver<DefectValues>,
  });
  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as DefectCreate | DefectUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, DEFECT_FIELDS));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      <FormError message={formError} />
      <div className="row">
        <div className="col-md-8">
          <TextInput
            id="def-title"
            label="Title"
            required
            registration={register('title')}
            error={errors.title}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id="def-ref"
            label="Defect reference"
            registration={register('externalRef')}
            error={errors.externalRef}
          />
        </div>
      </div>
      <TextArea
        id="def-description"
        label="Description"
        registration={register('description')}
        error={errors.description}
      />
      <RecordPicker
        projectId={project.id}
        type="test"
        label="Found by test case"
        value={testCase}
        error={errors.testCaseId?.message}
        onChange={(value) => {
          setTestCase(value);
          setValue('testCaseId', value?.id ?? null, { shouldDirty: true });
        }}
      />
      <div className="row">
        <div className="col-md-4">
          <RefSelect
            id="def-severity"
            label="Severity"
            category="PRIORITY"
            currentId={item?.severityId}
            registration={register('severityId', refSelect)}
            error={errors.severityId}
          />
        </div>
        <div className="col-md-4">
          <RefSelect
            id="def-status"
            label="Status"
            category="STATUS"
            currentId={item?.statusId}
            registration={register('statusId', refSelect)}
            error={errors.statusId}
          />
        </div>
        <div className="col-md-4">
          <TextInput
            id="def-assignee"
            label="Assignee"
            registration={register('assigneeName')}
            error={errors.assigneeName}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <TextInput
            id="def-fix-date"
            type="date"
            label="Target fix date"
            registration={register('targetFixDate')}
            error={errors.targetFixDate}
          />
        </div>
        <div className="col-md-8">
          <RecordPicker
            projectId={project.id}
            type="release"
            label="Fix version (planned release)"
            value={fixRelease}
            error={errors.targetFixReleaseId?.message}
            onChange={(value) => {
              setFixRelease(value);
              setValue('targetFixReleaseId', value?.id ?? null, { shouldDirty: true });
            }}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-6 col-md-4">
          <TextInput
            id="def-retest-date"
            type="date"
            label="Retest date"
            registration={register('retestDate')}
            error={errors.retestDate}
          />
        </div>
        <div className="col-6 col-md-4">
          <RefSelect
            id="def-retest-result"
            label="Retest result"
            category="TEST_RESULT"
            currentId={item?.retestResultId}
            emptyLabel="Not retested"
            registration={register('retestResultId', refSelect)}
            error={errors.retestResultId}
          />
        </div>
      </div>
      <TextArea
        id="def-remarks"
        label="Remarks"
        rows={2}
        registration={register('remarks')}
        error={errors.remarks}
      />
      <FormActions
        cancelTo={cancelTo}
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create defect'}
      />
    </form>
  );
}

export function DefectCreatePage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const create = defectsApi.useCreate(project.id);
  const testCaseId = params.get('testCase');
  const initialTestCase = testCaseId
    ? { id: testCaseId, code: params.get('testCode') ?? '', title: params.get('testTitle') ?? '' }
    : null;
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="New defect" />
      <DefectForm
        initialTestCase={initialTestCase}
        cancelTo="../..?view=defects"
        onSubmit={(values) => create.mutateAsync(values)}
        onDone={(saved) => void navigate(`../${saved.id}`, { relative: 'path' })}
      />
    </>
  );
}

export function DefectEditPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = defectsApi.useDetail(project.id, recordId);
  const update = defectsApi.useUpdate(project.id, recordId);
  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (project.archivedAt) return <ArchivedNotice />;
  return (
    <>
      <PageHeader title="Edit defect" code={item.code} />
      <DefectForm
        key={item.version}
        item={item}
        cancelTo=".."
        onSubmit={(values) => update.mutateAsync(values as DefectUpdate)}
        onDone={() => void navigate('..', { relative: 'path' })}
      />
    </>
  );
}
