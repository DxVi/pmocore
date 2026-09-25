import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flag, Plus } from 'lucide-react';
import type { WorkItem } from '@pmocore/shared';
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
import { workItemsApi } from './api';

const DEFAULTS = {
  q: '',
  state: '',
  phaseId: '',
  statusId: '',
  priorityId: '',
  milestone: '',
  sort: 'plannedEnd',
  dir: 'asc',
  page: '1',
};

const SORTS = [
  { value: 'plannedEnd:asc', label: 'Planned end (soonest)' },
  { value: 'code:asc', label: 'Code' },
  { value: 'percentComplete:asc', label: 'Least complete' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
];

function Progress({ value }: { value: number }) {
  return (
    <div className="d-flex align-items-center gap-2" style={{ minWidth: '6rem' }}>
      <div
        className="progress flex-grow-1"
        role="progressbar"
        aria-label="Percent complete"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: '0.5rem' }}
      >
        <div className="progress-bar" style={{ width: `${value}%` }} />
      </div>
      <span className="small">{value}%</span>
    </div>
  );
}

export function WorkItemsListPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();

  const params = {
    q: values.q || undefined,
    open: values.state === 'open' ? true : values.state === 'closed' ? false : undefined,
    phaseId: values.phaseId || undefined,
    statusId: values.statusId || undefined,
    priorityId: values.priorityId || undefined,
    milestone: values.milestone === 'true' ? true : undefined,
    sort: values.sort,
    dir: values.dir,
    page: values.page,
  };
  const { data, isLoading, error, refetch } = workItemsApi.useList(project.id, params);

  const columns = useMemo<Column<WorkItem>[]>(
    () => [
      {
        key: 'item',
        header: 'Deliverable / task',
        render: (w) => (
          <span>
            <span className="text-secondary small me-2">{w.code}</span>
            {w.isMilestone && (
              <Flag size={14} className="me-1 text-warning" aria-label="Milestone" />
            )}
            <span className="fw-medium">{w.title}</span>
          </span>
        ),
      },
      { key: 'phase', header: 'Phase', render: (w) => <StatusBadge valueId={w.phaseId} /> },
      { key: 'status', header: 'Status', render: (w) => <StatusBadge valueId={w.statusId} /> },
      {
        key: 'owner',
        header: 'Owner',
        render: (w) => <DerivedValue value={w.ownerName} unavailable="—" />,
      },
      {
        key: 'end',
        header: 'Planned end',
        render: (w) => <DerivedValue value={formatDate(w.plannedEnd)} unavailable="—" />,
      },
      {
        key: 'progress',
        header: 'Progress',
        render: (w) => <Progress value={w.percentComplete} />,
      },
    ],
    [],
  );

  const refOptions = (category: 'PROJECT_PHASE' | 'STATUS' | 'PRIORITY') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));
  const hasFilters = Boolean(
    values.q ||
    values.state ||
    values.phaseId ||
    values.statusId ||
    values.priorityId ||
    values.milestone,
  );

  return (
    <>
      <PageHeader
        title="Project Plan"
        actions={
          !project.archivedAt && (
            <Link to="new" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" className="me-1" />
              New work item
            </Link>
          )
        }
      />
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder="Search code, deliverable, workstream, owner"
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
          allLabel="All items"
          options={[
            { value: 'open', label: 'Open items' },
            { value: 'closed', label: 'Completed / inactive' },
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
          label="Priority"
          value={values.priorityId}
          onChange={(priorityId) => update({ priorityId })}
          options={refOptions('PRIORITY')}
        />
        <FilterSelect
          label="Milestones"
          value={values.milestone}
          onChange={(milestone) => update({ milestone })}
          allLabel="All"
          options={[{ value: 'true', label: 'Milestones only' }]}
        />
      </FilterBar>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyMessage={
          hasFilters ? 'No work items match these filters.' : 'No work items in the plan yet.'
        }
      >
        {data && (
          <>
            <DataList
              rows={data.items}
              columns={columns}
              rowKey={(w) => w.id}
              caption="Work items"
              onRowClick={(w) => void navigate(w.id)}
            />
            <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
          </>
        )}
      </QueryState>
    </>
  );
}
