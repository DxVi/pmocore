import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Release } from '@pmocore/shared';
import { DataList, type Column } from '@/components/DataList';
import { DerivedValue } from '@/components/DerivedValue';
import { FilterBar, FilterSelect } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { QueryState } from '@/components/QueryState';
import { StatusBadge } from '@/components/StatusBadge';
import { useListParams } from '@/hooks/useListParams';
import { useReferenceData } from '@/hooks/useReferenceData';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { releasesApi } from './api';

const DEFAULTS = {
  q: '',
  environmentId: '',
  deploymentStatusId: '',
  sort: 'releaseDate',
  dir: 'desc',
  page: '1',
};

const SORTS = [
  { value: 'releaseDate:desc', label: 'Newest release date' },
  { value: 'releaseDate:asc', label: 'Oldest release date' },
  { value: 'versionLabel:asc', label: 'Version' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
];

export function ReleasesListPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();

  const params = {
    q: values.q || undefined,
    environmentId: values.environmentId || undefined,
    deploymentStatusId: values.deploymentStatusId || undefined,
    sort: values.sort,
    dir: values.dir,
    page: values.page,
  };
  const { data, isLoading, error, refetch } = releasesApi.useList(project.id, params);

  const columns = useMemo<Column<Release>[]>(
    () => [
      {
        key: 'version',
        header: 'Release',
        render: (r) => (
          <span>
            <span className="text-secondary small me-2">{r.code}</span>
            <span className="fw-medium">{r.versionLabel}</span>
            {r.name && <span className="text-secondary ms-2">{r.name}</span>}
          </span>
        ),
      },
      {
        key: 'env',
        header: 'Environment',
        render: (r) => <StatusBadge valueId={r.environmentId} />,
      },
      {
        key: 'deploy',
        header: 'Deployment',
        render: (r) => <StatusBadge valueId={r.deploymentStatusId} />,
      },
      {
        key: 'date',
        header: 'Release date',
        render: (r) => (
          <DerivedValue value={formatDate(r.releaseDate ?? r.plannedDate)} unavailable="—" />
        ),
      },
      {
        key: 'uat',
        header: 'UAT result',
        render: (r) => <StatusBadge valueId={r.uatResultId} emptyLabel="—" />,
      },
    ],
    [],
  );

  const refOptions = (category: 'ENVIRONMENT' | 'STATUS') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));
  const hasFilters = Boolean(values.q || values.environmentId || values.deploymentStatusId);

  return (
    <>
      <PageHeader
        title="Releases & Acceptance"
        actions={
          !project.archivedAt && (
            <Link to="new" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" className="me-1" />
              New release
            </Link>
          )
        }
      />
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder="Search code, version, name, scope"
        onClear={hasFilters ? reset : undefined}
        sort={{
          value: `${values.sort}:${values.dir}`,
          options: SORTS,
          onChange: (value) => {
            const [sort, dir] = value.split(':');
            update({ sort, dir });
          },
        }}
      >
        <FilterSelect
          label="Environment"
          value={values.environmentId}
          onChange={(environmentId) => update({ environmentId })}
          options={refOptions('ENVIRONMENT')}
        />
        <FilterSelect
          label="Deployment status"
          value={values.deploymentStatusId}
          onChange={(deploymentStatusId) => update({ deploymentStatusId })}
          options={refOptions('STATUS')}
        />
      </FilterBar>
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyMessage={hasFilters ? 'No releases match these filters.' : 'No releases recorded yet.'}
      >
        {data && (
          <>
            <DataList
              rows={data.items}
              columns={columns}
              rowKey={(r) => r.id}
              caption="Releases"
              onRowClick={(r) => void navigate(r.id)}
            />
            <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
          </>
        )}
      </QueryState>
    </>
  );
}
