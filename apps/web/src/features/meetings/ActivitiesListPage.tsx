import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Paperclip, Plus } from 'lucide-react';
import type { ActivityListItem, ActivityListQuery } from '@pmocore/shared';
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
import { useActivities } from './api';

const DEFAULTS = {
  q: '',
  when: '',
  activityTypeId: '',
  statusId: '',
  from: '',
  to: '',
  sort: 'activityDate',
  dir: 'desc',
  page: '1',
};

const SORTS = [
  { value: 'activityDate:desc', label: 'Newest first' },
  { value: 'activityDate:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'code:asc', label: 'Code' },
];

const time = (value: string | null) => (value ? value.slice(0, 5) : '');

export function ActivitiesListPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();

  const query: Partial<ActivityListQuery> = {
    q: values.q || undefined,
    activityTypeId: values.activityTypeId ? Number(values.activityTypeId) : undefined,
    statusId: values.statusId ? Number(values.statusId) : undefined,
    from: values.from || undefined,
    to: values.to || undefined,
    upcoming: values.when === 'upcoming' ? true : undefined,
    sort: values.sort as ActivityListQuery['sort'],
    dir: values.dir as ActivityListQuery['dir'],
    page: Number(values.page) || 1,
  };
  const { data, isLoading, error, refetch } = useActivities(project.id, query);

  const columns = useMemo<Column<ActivityListItem>[]>(
    () => [
      {
        key: 'activity',
        header: 'Meeting / visit',
        render: (a) => (
          <span>
            <span className="text-secondary small me-2">{a.code}</span>
            <span className="fw-medium">{a.title}</span>
          </span>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        render: (a) => `${formatDate(a.activityDate) ?? ''} ${time(a.startTime)}`.trim(),
      },
      { key: 'type', header: 'Type', render: (a) => <StatusBadge valueId={a.activityTypeId} /> },
      { key: 'status', header: 'Status', render: (a) => <StatusBadge valueId={a.statusId} /> },
      {
        key: 'location',
        header: 'Location',
        render: (a) => <DerivedValue value={a.location} unavailable="—" />,
      },
      {
        key: 'followups',
        header: 'Open actions',
        render: (a) =>
          a.openActionCount > 0 ? (
            <Badge tone="primary">{String(a.openActionCount)}</Badge>
          ) : (
            <span className="text-secondary">0</span>
          ),
      },
      {
        key: 'attachments',
        header: 'Files',
        render: (a) => (
          <span className="text-secondary d-inline-flex align-items-center gap-1">
            <Paperclip size={14} aria-hidden="true" />
            {a.attachmentCount}
          </span>
        ),
      },
    ],
    [],
  );

  const refOptions = (category: 'ACTIVITY_TYPE' | 'STATUS') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));
  const hasFilters = Boolean(
    values.q || values.when || values.activityTypeId || values.statusId || values.from || values.to,
  );

  return (
    <>
      <PageHeader
        title="Meetings & Visits"
        actions={
          !project.archivedAt && (
            <Link to="new" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" className="me-1" />
              New meeting / visit
            </Link>
          )
        }
      />
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder="Search title, attendees, location, findings"
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
          label="Schedule"
          value={values.when}
          onChange={(when) => update({ when })}
          allLabel="All dates"
          options={[{ value: 'upcoming', label: 'Upcoming (open)' }]}
        />
        <FilterSelect
          label="Type"
          value={values.activityTypeId}
          onChange={(activityTypeId) => update({ activityTypeId })}
          options={refOptions('ACTIVITY_TYPE')}
        />
        <FilterSelect
          label="Status"
          value={values.statusId}
          onChange={(statusId) => update({ statusId })}
          options={refOptions('STATUS')}
        />
        <div className="pmo-filter-field">
          <label htmlFor="activities-from" className="form-label small text-secondary mb-1">
            From
          </label>
          <input
            id="activities-from"
            type="date"
            className="form-control form-control-sm"
            value={values.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </div>
        <div className="pmo-filter-field">
          <label htmlFor="activities-to" className="form-label small text-secondary mb-1">
            To
          </label>
          <input
            id="activities-to"
            type="date"
            className="form-control form-control-sm"
            value={values.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </div>
      </FilterBar>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyMessage={
          hasFilters
            ? 'No meetings or visits match these filters.'
            : 'No meetings or visits recorded yet.'
        }
        emptyAction={
          hasFilters || project.archivedAt ? undefined : (
            <Link to="new" className="btn btn-primary">
              New meeting / visit
            </Link>
          )
        }
      >
        {data && (
          <>
            <DataList
              rows={data.items}
              columns={columns}
              rowKey={(a) => a.id}
              caption="Meetings and visits"
              onRowClick={(a) => void navigate(a.id)}
            />
            <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
          </>
        )}
      </QueryState>
    </>
  );
}
