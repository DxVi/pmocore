import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  ProjectCreateSchema,
  ProjectUpdateSchema,
  type Project,
  type ProjectCreate,
  type ProjectCreateInput,
  type ProjectUpdate,
} from '@pmocore/shared';
import { Field } from '@/components/form/Field';
import { applyServerErrors, asOptionalNumber } from '@/components/form/form-utils';
import { PageHeader } from '@/components/PageHeader';
import { RefOptions } from '@/components/RefOptions';
import { useCreateProject, useUpdateProject } from './api';
import { useCurrentProject } from './project-context';

type FormValues = ProjectCreateInput & { version?: number };

const FIELDS = [
  'code',
  'name',
  'summary',
  'phaseId',
  'statusId',
  'healthId',
  'startDate',
  'targetDate',
  'goLiveDate',
  'nextMilestoneLabel',
  'nextMilestoneDate',
  'pmRemarks',
] as const;

function toFormValues(project?: Project): FormValues {
  return {
    code: project?.code ?? '',
    name: project?.name ?? '',
    summary: project?.summary ?? '',
    phaseId: project?.phaseId ?? null,
    statusId: project?.statusId ?? null,
    healthId: project?.healthId ?? null,
    startDate: project?.startDate ?? '',
    targetDate: project?.targetDate ?? '',
    goLiveDate: project?.goLiveDate ?? '',
    nextMilestoneLabel: project?.nextMilestoneLabel ?? '',
    nextMilestoneDate: project?.nextMilestoneDate ?? '',
    pmRemarks: project?.pmRemarks ?? '',
    version: project?.version,
  };
}

type ProjectFormProps = {
  project?: Project;
  onSubmit: (values: ProjectCreate | ProjectUpdate) => Promise<Project>;
  onDone: (project: Project) => void;
  cancelTo: string;
};

function ProjectForm({ project, onSubmit, onDone, cancelTo }: ProjectFormProps) {
  const isEdit = Boolean(project);
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: toFormValues(project),
    resolver: zodResolver(
      isEdit ? ProjectUpdateSchema : ProjectCreateSchema,
    ) as unknown as Resolver<FormValues>,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      onDone(await onSubmit(values as unknown as ProjectCreate | ProjectUpdate));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  const input = (name: (typeof FIELDS)[number]) =>
    `form-control ${errors[name] ? 'is-invalid' : ''}`;

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="pmo-form">
      {formError && (
        <div className="alert alert-danger" role="alert">
          {formError}
        </div>
      )}
      <div className="row">
        <div className="col-md-4">
          <Field
            id="project-code"
            label="Project code"
            required={!isEdit}
            error={errors.code}
            hint={
              isEdit ? 'The code cannot be changed.' : 'e.g. BASC-CQMS (letters, numbers, hyphen)'
            }
          >
            <input
              id="project-code"
              className={`${input('code')} text-uppercase`}
              autoCapitalize="characters"
              disabled={isEdit}
              {...register('code')}
            />
          </Field>
        </div>
        <div className="col-md-8">
          <Field id="project-name" label="Project name" required error={errors.name}>
            <input id="project-name" className={input('name')} {...register('name')} />
          </Field>
        </div>
      </div>

      <Field id="project-summary" label="Summary" error={errors.summary}>
        <textarea
          id="project-summary"
          rows={3}
          className={input('summary')}
          {...register('summary')}
        />
      </Field>

      <div className="row">
        <div className="col-md-4">
          <Field id="project-phase" label="Current phase" error={errors.phaseId}>
            <select
              id="project-phase"
              className="form-select"
              {...register('phaseId', { setValueAs: asOptionalNumber })}
            >
              <RefOptions category="PROJECT_PHASE" currentId={project?.phaseId} />
            </select>
          </Field>
        </div>
        <div className="col-md-4">
          <Field id="project-status" label="Overall status" error={errors.statusId}>
            <select
              id="project-status"
              className="form-select"
              {...register('statusId', { setValueAs: asOptionalNumber })}
            >
              <RefOptions category="STATUS" currentId={project?.statusId} />
            </select>
          </Field>
        </div>
        <div className="col-md-4">
          <Field id="project-health" label="Health" error={errors.healthId}>
            <select
              id="project-health"
              className="form-select"
              {...register('healthId', { setValueAs: asOptionalNumber })}
            >
              <RefOptions
                category="HEALTH"
                currentId={project?.healthId}
                emptyLabel="Not assessed"
              />
            </select>
          </Field>
        </div>
      </div>

      <div className="row">
        <div className="col-sm-4">
          <Field id="project-start" label="Start date" error={errors.startDate}>
            <input
              id="project-start"
              type="date"
              className={input('startDate')}
              {...register('startDate')}
            />
          </Field>
        </div>
        <div className="col-sm-4">
          <Field id="project-target" label="Target date" error={errors.targetDate}>
            <input
              id="project-target"
              type="date"
              className={input('targetDate')}
              {...register('targetDate')}
            />
          </Field>
        </div>
        <div className="col-sm-4">
          <Field id="project-golive" label="Go-live date" error={errors.goLiveDate}>
            <input
              id="project-golive"
              type="date"
              className={input('goLiveDate')}
              {...register('goLiveDate')}
            />
          </Field>
        </div>
      </div>

      <div className="row">
        <div className="col-sm-8">
          <Field
            id="project-milestone"
            label="Next milestone"
            error={errors.nextMilestoneLabel}
            hint="Used when no milestone work item is scheduled."
          >
            <input
              id="project-milestone"
              className={input('nextMilestoneLabel')}
              {...register('nextMilestoneLabel')}
            />
          </Field>
        </div>
        <div className="col-sm-4">
          <Field
            id="project-milestone-date"
            label="Milestone date"
            error={errors.nextMilestoneDate}
          >
            <input
              id="project-milestone-date"
              type="date"
              className={input('nextMilestoneDate')}
              {...register('nextMilestoneDate')}
            />
          </Field>
        </div>
      </div>

      <Field id="project-remarks" label="PM remarks" error={errors.pmRemarks}>
        <textarea
          id="project-remarks"
          rows={3}
          className={input('pmRemarks')}
          {...register('pmRemarks')}
        />
      </Field>

      <div className="d-flex flex-column-reverse flex-sm-row gap-2 justify-content-sm-end pmo-form-actions">
        <Link to={cancelTo} className="btn btn-outline-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          )}
          {isEdit ? 'Save changes' : 'Create project'}
        </button>
      </div>
    </form>
  );
}

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const create = useCreateProject();
  return (
    <>
      <PageHeader title="New project" />
      <ProjectForm
        onSubmit={(values) => create.mutateAsync(values as ProjectCreate)}
        onDone={(project) => void navigate(`/projects/${project.id}`)}
        cancelTo="/projects"
      />
    </>
  );
}

export function ProjectEditPage() {
  const navigate = useNavigate();
  const project = useCurrentProject();
  const update = useUpdateProject(project.id);

  if (project.archivedAt) {
    return (
      <div className="alert alert-secondary">
        This project is archived and read-only. Unarchive it from the overview to make changes.
      </div>
    );
  }

  return (
    <>
      <h2 className="h5 mb-3">Edit project</h2>
      <ProjectForm
        key={project.version}
        project={project}
        onSubmit={(values) => update.mutateAsync(values as ProjectUpdate)}
        onDone={(saved) => void navigate(`/projects/${saved.id}`)}
        cancelTo={`/projects/${project.id}`}
      />
    </>
  );
}
