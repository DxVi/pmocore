import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { RaidItem, RaidItemListQuery } from '@pmocore/shared';
import { DataList, type Column } from '@/components/DataList';
import { DerivedValue } from '@/components/DerivedValue';
import { FilterBar, FilterSelect } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { QueryState } from '@/components/QueryState';
import { Badge, StatusBadge } from '@/components/StatusBadge';
import { useListParams } from '@/hooks/useListParams';
import { useReferenceData } from '@/hooks/useReferenceData';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { useRaidItems } from './api';

// Open items are shown by default; "All" includes closed and inactive items.
const DEFAULTS = {
  q: '',
  state: 'open',
  typeId: '',
  statusId: '',
  priorityId: '',
  owner: '',
  sourceActivityId: '',
  sort: 'dueDate',
  dir: 'asc',
  page: '1',
};

const SORTS = [
  { value: 'dueDate:asc', label: 'Due date (soonest)' },
  { value: 'priority:asc', label: 'Priority (highest)' },
  { value: 'dateRaised:desc', label: 'Newest raised' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'code:asc', label: 'Code' },
];

export function RaidListPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();

  const query: Partial<RaidItemListQuery> = {
    q: values.q || undefined,
    open:
      values.state === 'open' || values.state === 'overdue'
        ? true
        : values.state === 'closed'
          ? false
          : undefined,
    overdue: values.state === 'overdue' ? true : undefined,
    typeId: values.typeId ? Number(values.typeId) : undefined,
    statusId: values.statusId ? Number(values.statusId) : undefined,
    priorityId: values.priorityId ? Number(values.priorityId) : undefined,
    owner: values.owner || undefined,
    sourceActivityId: values.sourceActivityId || undefined,
    sort: values.sort as RaidItemListQuery['sort'],
    dir: values.dir as RaidItemListQuery['dir'],
    page: Number(values.page) || 1,
  };
  const { data, isLoading, error, refetch } = useRaidItems(project.id, query);

  const columns = useMemo<Column<RaidItem>[]>(
    () => [
      {
        key: 'item',
        header: 'Item',
        render: (r) => (
          <span>
            <span className="text-secondary small me-2">{r.code}</span>
            <span className="fw-medium">{r.title}</span>
          </span>
        ),
      },
      { key: 'type', header: 'Type', render: (r) => <StatusBadge valueId={r.typeId} /> },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge valueId={r.statusId} /> },
      {
        key: 'priority',
        header: 'Priority',
        render: (r) => <StatusBadge valueId={r.priorityId} />,
      },
      {
        key: 'owner',
        header: 'Owner',
        render: (r) => <DerivedValue value={r.ownerName} unavailable="—" />,
      },
      {
        key: 'due',
        header: 'Due',
        render: (r) => (
          <span className="d-inline-flex flex-wrap gap-1 align-items-center">
            <DerivedValue value={formatDate(r.dueDate)} unavailable="—" />
            {r.overdue && <Badge tone="danger">Overdue</Badge>}
          </span>
        ),
      },
      {
        key: 'age',
        header: 'Days open',
        hideOnCard: true,
        render: (r) => <span className="text-secondary">{r.daysOpen}</span>,
      },
    ],
    [],
  );

  const refOptions = (category: 'RAID_TYPE' | 'STATUS' | 'PRIORITY') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));
  const hasFilters = Boolean(
    values.q ||
    values.state !== 'open' ||
    values.typeId ||
    values.statusId ||
    values.priorityId ||
    values.owner ||
    values.sourceActivityId,
  );

  return (
    <>
      <PageHeader
        title="Actions & RAID"
        actions={
          !project.archivedAt && (
            <Link to="new" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" className="me-1" />
              New item
            </Link>
          )
        }
      />
      {values.sourceActivityId && (
        <div className="alert alert-info py-2 d-flex flex-wrap gap-2 align-items-center">
          Showing items raised from one meeting / visit.
          <button
            type="button"
            className="btn btn-sm btn-link p-0"
            onClick={() => update({ sourceActivityId: '' })}
          >
            Show all
          </button>
        </div>
      )}
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder="Search code, title, description, owner"
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
          value={values.state === 'open' ? '' : values.state}
          onChange={(state) => update({ state: state || 'open' })}
          allLabel="Open items"
          options={[
            { value: 'overdue', label: 'Overdue items' },
            { value: 'closed', label: 'Closed / inactive items' },
            { value: 'all', label: 'All items' },
          ]}
        />
        <FilterSelect
          label="Type"
          value={values.typeId}
          onChange={(typeId) => update({ typeId })}
          options={refOptions('RAID_TYPE')}
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
        <div className="pmo-filter-field">
          <label htmlFor="raid-owner" className="form-label small text-secondary mb-1">
            Owner
          </label>
          <input
            id="raid-owner"
            className="form-control form-control-sm"
            defaultValue={values.owner}
            onBlur={(event) => update({ owner: event.target.value.trim() })}
          />
        </div>
      </FilterBar>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyMessage={
          hasFilters ? 'No items match these filters.' : 'No open actions, risks or issues.'
        }
      >
        {data && (
          <>
            <DataList
              rows={data.items}
              columns={columns}
              rowKey={(r) => r.id}
              caption="Actions and RAID items"
              onRowClick={(r) => void navigate(r.id)}
            />
            <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
          </>
        )}
      </QueryState>
    </>
  );
}
