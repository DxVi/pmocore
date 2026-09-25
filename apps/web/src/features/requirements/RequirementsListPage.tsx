import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Requirement } from '@pmocore/shared';
import { DataList, type Column } from '@/components/DataList';
import { DerivedValue } from '@/components/DerivedValue';
import { FilterBar, FilterSelect } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { QueryState } from '@/components/QueryState';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { useListParams } from '@/hooks/useListParams';
import { useHasReferenceValues, useReferenceData } from '@/hooks/useReferenceData';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { requirementsApi } from './api';

const DEFAULTS = {
  q: '',
  state: '',
  statusId: '',
  priorityId: '',
  requirementTypeId: '',
  changeRequest: '',
  sort: 'updatedAt',
  dir: 'desc',
  page: '1',
};

const SORTS = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'code:asc', label: 'Code' },
  { value: 'priority:asc', label: 'Priority (highest)' },
  { value: 'dateRaised:desc', label: 'Newest raised' },
];

export function RequirementsListPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();
  const hasTypes = useHasReferenceValues('REQUIREMENT_TYPE');

  const params = {
    q: values.q || undefined,
    open: values.state === 'open' ? true : values.state === 'closed' ? false : undefined,
    statusId: values.statusId || undefined,
    priorityId: values.priorityId || undefined,
    requirementTypeId: values.requirementTypeId || undefined,
    changeRequest: values.changeRequest === 'true' ? true : undefined,
    sort: values.sort,
    dir: values.dir,
    page: values.page,
  };
  const { data, isLoading, error, refetch } = requirementsApi.useList(project.id, params);

  const columns = useMemo<Column<Requirement>[]>(
    () => [
      {
        key: 'statement',
        header: 'Requirement',
        render: (r) => (
          <span>
            <span className="text-secondary small me-2">{r.code}</span>
            <span className="fw-medium">{r.statement}</span>
            {r.isChangeRequest && (
              <Badge tone="info" className="ms-2">
                CR
              </Badge>
            )}
          </span>
        ),
      },
      {
        key: 'module',
        header: 'Module',
        render: (r) => <DerivedValue value={r.module} unavailable="—" />,
      },
      {
        key: 'priority',
        header: 'Priority',
        render: (r) => <StatusBadge valueId={r.priorityId} />,
      },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge valueId={r.statusId} /> },
      {
        key: 'raised',
        header: 'Raised',
        hideOnCard: true,
        render: (r) => <DerivedValue value={formatDate(r.dateRaised)} unavailable="—" />,
      },
    ],
    [],
  );

  const refOptions = (category: 'STATUS' | 'PRIORITY' | 'REQUIREMENT_TYPE') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));
  const hasFilters = Boolean(
    values.q ||
    values.state ||
    values.statusId ||
    values.priorityId ||
    values.requirementTypeId ||
    values.changeRequest,
  );

  return (
    <>
      <PageHeader
        title="Requirements"
        actions={
          !project.archivedAt && (
            <Link to="new" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" className="me-1" />
              New requirement
            </Link>
          )
        }
      />
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder="Search code, statement, module, source"
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
          label="Show"
          value={values.state}
          onChange={(state) => update({ state })}
          allLabel="All requirements"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Completed / accepted / inactive' },
          ]}
        />
        <FilterSelect
          label="Status"
          value={values.statusId}
          onChange={(statusId) => update({ statusId })}
          options={refOptions('STATUS')}
        />
        <FilterSelect
          label="Priority"
          value={values.priorityId}
          onChange={(priorityId) => update({ priorityId })}
          options={refOptions('PRIORITY')}
        />
        {hasTypes && (
          <FilterSelect
            label="Type"
            value={values.requirementTypeId}
            onChange={(requirementTypeId) => update({ requirementTypeId })}
            options={refOptions('REQUIREMENT_TYPE')}
          />
        )}
        <FilterSelect
          label="Change requests"
          value={values.changeRequest}
          onChange={(changeRequest) => update({ changeRequest })}
          allLabel="All"
          options={[{ value: 'true', label: 'Change requests only' }]}
        />
      </FilterBar>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyMessage={
          hasFilters ? 'No requirements match these filters.' : 'No requirements recorded yet.'
        }
      >
        {data && (
          <>
            <DataList
              rows={data.items}
              columns={columns}
              rowKey={(r) => r.id}
              caption="Requirements"
              onRowClick={(r) => void navigate(r.id)}
            />
            <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
          </>
        )}
      </QueryState>
    </>
  );
}
