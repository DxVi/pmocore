import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Plus } from 'lucide-react';
import type { ProjectDocument } from '@pmocore/shared';
import { DataList, type Column } from '@/components/DataList';
import { DerivedValue } from '@/components/DerivedValue';
import { FilterBar, FilterSelect } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { QueryState } from '@/components/QueryState';
import { StatusBadge } from '@/components/StatusBadge';
import { useListParams } from '@/hooks/useListParams';
import { useHasReferenceValues, useReferenceData } from '@/hooks/useReferenceData';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { documentsApi } from './api';

const DEFAULTS = {
  q: '',
  phaseId: '',
  documentTypeId: '',
  statusId: '',
  sort: 'updatedAt',
  dir: 'desc',
  page: '1',
};

const SORTS = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'documentDate:desc', label: 'Newest document date' },
  { value: 'title:asc', label: 'Title' },
  { value: 'code:asc', label: 'Code' },
];

export function DocumentsListPage() {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();
  const hasTypes = useHasReferenceValues('DOCUMENT_TYPE');

  const params = {
    q: values.q || undefined,
    phaseId: values.phaseId || undefined,
    documentTypeId: values.documentTypeId || undefined,
    statusId: values.statusId || undefined,
    sort: values.sort,
    dir: values.dir,
    page: values.page,
  };
  const { data, isLoading, error, refetch } = documentsApi.useList(project.id, params);

  const columns = useMemo<Column<ProjectDocument>[]>(
    () => [
      {
        key: 'title',
        header: 'Document',
        render: (d) => (
          <span>
            <span className="text-secondary small me-2">{d.code}</span>
            <span className="fw-medium">{d.title}</span>
            {d.docVersion && <span className="text-secondary ms-2">v{d.docVersion}</span>}
          </span>
        ),
      },
      { key: 'phase', header: 'Phase', render: (d) => <StatusBadge valueId={d.phaseId} /> },
      { key: 'status', header: 'Status', render: (d) => <StatusBadge valueId={d.statusId} /> },
      {
        key: 'owner',
        header: 'Owner',
        render: (d) => <DerivedValue value={d.ownerName} unavailable="—" />,
      },
      {
        key: 'date',
        header: 'Date',
        render: (d) => <DerivedValue value={formatDate(d.documentDate)} unavailable="—" />,
      },
      {
        key: 'link',
        header: 'Link',
        hideOnCard: true,
        render: (d) =>
          d.linkUrl ? (
            <a
              href={d.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              aria-label={`Open link for ${d.code}`}
            >
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ) : (
            <span className="text-secondary">—</span>
          ),
      },
    ],
    [],
  );

  const refOptions = (category: 'PROJECT_PHASE' | 'STATUS' | 'DOCUMENT_TYPE') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));
  const hasFilters = Boolean(
    values.q || values.phaseId || values.documentTypeId || values.statusId,
  );

  return (
    <>
      <PageHeader
        title="Documents"
        actions={
          !project.archivedAt && (
            <Link to="new" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" className="me-1" />
              New document
            </Link>
          )
        }
      />
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder="Search code, title, owner, version"
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
          label="Phase"
          value={values.phaseId}
          onChange={(phaseId) => update({ phaseId })}
          options={refOptions('PROJECT_PHASE')}
        />
        {hasTypes && (
          <FilterSelect
            label="Type"
            value={values.documentTypeId}
            onChange={(documentTypeId) => update({ documentTypeId })}
            options={refOptions('DOCUMENT_TYPE')}
          />
        )}
        <FilterSelect
          label="Status"
          value={values.statusId}
          onChange={(statusId) => update({ statusId })}
          options={refOptions('STATUS')}
        />
      </FilterBar>
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={data?.items.length === 0}
        emptyMessage={
          hasFilters ? 'No documents match these filters.' : 'No documents recorded yet.'
        }
      >
        {data && (
          <>
            <DataList
              rows={data.items}
              columns={columns}
              rowKey={(d) => d.id}
              caption="Documents"
              onRowClick={(d) => void navigate(d.id)}
            />
            <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
          </>
        )}
      </QueryState>
    </>
  );
}
