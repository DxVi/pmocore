import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PROJECT_SORT_FIELDS, type Project, type ProjectListQuery } from '@pmocore/shared';
import { DataList, type Column } from '@/components/DataList';
import { DerivedValue } from '@/components/DerivedValue';
import { FilterBar, FilterSelect } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { QueryState } from '@/components/QueryState';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { useListParams } from '@/hooks/useListParams';
import { useReferenceData } from '@/hooks/useReferenceData';
import { formatDate, formatRelative } from '@/lib/format';
import { useProjects } from './api';

const DEFAULTS = {
  q: '',
  archived: 'active',
  statusId: '',
  phaseId: '',
  healthId: '',
  sort: 'updatedAt',
  dir: 'desc',
  page: '1',
};

const SORT_LABELS: Record<(typeof PROJECT_SORT_FIELDS)[number], string> = {
  updatedAt: 'Recently updated',
  code: 'Code',
  name: 'Name',
  targetDate: 'Target date',
};

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();

  const query: Partial<ProjectListQuery> = {
    q: values.q || undefined,
    archived: values.archived as ProjectListQuery['archived'],
    statusId: values.statusId ? Number(values.statusId) : undefined,
    phaseId: values.phaseId ? Number(values.phaseId) : undefined,
    healthId: values.healthId ? Number(values.healthId) : undefined,
    sort: values.sort as ProjectListQuery['sort'],
    dir: values.dir as ProjectListQuery['dir'],
    page: Number(values.page) || 1,
  };
  const { data, isLoading, error, refetch } = useProjects(query);

  const refOptions = (category: 'STATUS' | 'PROJECT_PHASE' | 'HEALTH') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));

  const columns = useMemo<Column<Project>[]>(
    () => [
      {
        key: 'project',
        header: 'Project',
        render: (p) => (
          <span>
            <span className="fw-semibold me-2">{p.code}</span>
            <span>{p.name}</span>
            {p.archivedAt && (
              <Badge tone="neutral" className="ms-2">
                Archived
              </Badge>
            )}
          </span>
        ),
      },
      { key: 'phase', header: 'Phase', render: (p) => <StatusBadge valueId={p.phaseId} /> },
      { key: 'status', header: 'Status', render: (p) => <StatusBadge valueId={p.statusId} /> },
      {
        key: 'health',
        header: 'Health',
        render: (p) => <StatusBadge valueId={p.healthId} emptyLabel="Not assessed" />,
      },
      {
        key: 'target',
        header: 'Target date',
        render: (p) => <DerivedValue value={formatDate(p.targetDate)} unavailable="Not set" />,
      },
      {
        key: 'updated',
        header: 'Updated',
        hideOnCard: true,
        render: (p) => <span className="text-secondary small">{formatRelative(p.updatedAt)}</span>,
      },
    ],
    [],
  );

  const hasFilters = Boolean(
    values.q ||
    values.statusId ||
    values.phaseId ||
    values.healthId ||
    values.archived !== 'active',
  );

  return (
    <>
      <PageHeader
        title="Projects"
        actions={
          <Link to="/projects/new" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" className="me-1" />
            New project
          </Link>
        }
      />
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder="Search by code or name"
        onClear={hasFilters ? reset : undefined}
        sort={{
          value: `${values.sort}:${values.dir}`,
          onChange: (value) => {
            const [sort, dir] = value.split(':');
            update({ sort, dir });
          },
          options: PROJECT_SORT_FIELDS.flatMap((field) => [
            { value: `${field}:desc`, label: `${SORT_LABELS[field]} (desc)` },
            { value: `${field}:asc`, label: `${SORT_LABELS[field]} (asc)` },
          ]),
        }}
      >
        <FilterSelect
          label="Records"
          value={values.archived === 'active' ? '' : values.archived}
          onChange={(archived) => update({ archived: archived || 'active' })}
          allLabel="Active projects"
          options={[
            { value: 'archived', label: 'Archived projects' },
            { value: 'all', label: 'All projects' },
          ]}
        />
        <FilterSelect
          label="Phase"
          value={values.phaseId}
          onChange={(phaseId) => update({ phaseId })}
          options={refOptions('PROJECT_PHASE')}
        />
        <FilterSelect
          label="Status"
          value={values.statusId}
          onChange={(statusId) => update({ statusId })}
          options={refOptions('STATUS')}
        />
        <FilterSelect
          label="Health"
          value={values.healthId}
          onChange={(healthId) => update({ healthId })}
          options={refOptions('HEALTH')}
        />
      </FilterBar>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyMessage={
          hasFilters
            ? 'No projects match these filters.'
            : 'No projects yet. Create your first project to get started.'
        }
        emptyAction={
          hasFilters ? undefined : (
            <Link to="/projects/new" className="btn btn-primary">
              New project
            </Link>
          )
        }
      >
        {data && (
          <>
            <DataList
              rows={data.items}
              columns={columns}
              rowKey={(p) => p.id}
              caption="Projects"
              onRowClick={(p) => void navigate(`/projects/${p.id}`)}
            />
            <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
          </>
        )}
      </QueryState>
    </>
  );
}
