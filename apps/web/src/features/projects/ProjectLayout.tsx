import { NavLink, Outlet, useParams } from 'react-router-dom';
import { ApiClientError } from '@/lib/api-client';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { useProject } from './api';
import type { ProjectOutletContext } from './project-context';

const MODULES = [
  { to: '', label: 'Overview', end: true },
  { to: 'plan', label: 'Plan' },
  { to: 'requirements', label: 'Requirements' },
  { to: 'meetings', label: 'Meetings & Visits' },
  { to: 'raid', label: 'Actions & RAID' },
  { to: 'testing', label: 'Testing' },
  { to: 'releases', label: 'Releases' },
  { to: 'documents', label: 'Documents' },
];

/** Project header and module navigation shared by every project page. */
export function ProjectLayout() {
  const { projectId = '' } = useParams();
  const { data: project, isLoading, error, refetch } = useProject(projectId);

  if (isLoading) return <LoadingState label="Loading project…" />;
  if (error instanceof ApiClientError && error.status === 404) return <NotFoundPage />;
  if (error || !project) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const context: ProjectOutletContext = { project };

  return (
    <>
      <div className="mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
          <span className="text-secondary fw-semibold small">{project.code}</span>
          {project.archivedAt && <Badge tone="neutral">Archived</Badge>}
        </div>
        <h1 className="h3 mb-2 text-break">{project.name}</h1>
        <div className="d-flex flex-wrap gap-2">
          <StatusBadge valueId={project.phaseId} emptyLabel="Phase not set" />
          <StatusBadge valueId={project.statusId} emptyLabel="Status not set" />
          <StatusBadge valueId={project.healthId} emptyLabel="Health not assessed" />
        </div>
      </div>

      {project.archivedAt && (
        <div className="alert alert-secondary py-2" role="status">
          This project is archived. Its records are kept and can be viewed, but not changed.
        </div>
      )}

      <nav aria-label="Project sections" className="mb-4 pmo-module-nav">
        <ul className="nav nav-pills flex-nowrap overflow-auto pb-1">
          {MODULES.map((module) => (
            <li key={module.label} className="nav-item flex-shrink-0">
              <NavLink
                to={module.to}
                end={module.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {module.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet context={context} />
    </>
  );
}
