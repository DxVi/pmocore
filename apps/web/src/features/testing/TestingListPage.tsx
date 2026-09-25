import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Defect, TestCase } from '@pmocore/shared';
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
import { defectsApi, testsApi } from './api';

const DEFAULTS = {
  view: 'tests',
  q: '',
  stageId: '',
  resultId: '',
  statusId: '',
  severityId: '',
  state: '',
  sort: 'updatedAt',
  dir: 'desc',
  page: '1',
};

function TestsList({ values, update }: ListProps) {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const params = {
    q: values.q || undefined,
    stageId: values.stageId || undefined,
    resultId: values.resultId || undefined,
    statusId: values.statusId || undefined,
    sort: ['code', 'testDate', 'updatedAt'].includes(values.sort) ? values.sort : 'updatedAt',
    dir: values.dir,
    page: values.page,
  };
  const { data, isLoading, error, refetch } = testsApi.useList(project.id, params);
  const columns = useMemo<Column<TestCase>[]>(
    () => [
      {
        key: 'scenario',
        header: 'Test scenario',
        render: (t) => (
          <span>
            <span className="text-secondary small me-2">{t.code}</span>
            <span className="fw-medium">{t.scenario}</span>
          </span>
        ),
      },
      { key: 'stage', header: 'Stage', render: (t) => <StatusBadge valueId={t.stageId} /> },
      {
        key: 'result',
        header: 'Latest result',
        render: (t) => <StatusBadge valueId={t.resultId} emptyLabel="Not run" />,
      },
      {
        key: 'tester',
        header: 'Tester',
        render: (t) => <DerivedValue value={t.testerName} unavailable="—" />,
      },
      {
        key: 'date',
        header: 'Test date',
        render: (t) => <DerivedValue value={formatDate(t.testDate)} unavailable="—" />,
      },
    ],
    [],
  );
  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      isEmpty={data?.items.length === 0}
      emptyMessage="No test cases found."
    >
      {data && (
        <>
          <DataList
            rows={data.items}
            columns={columns}
            rowKey={(t) => t.id}
            caption="Test cases"
            onRowClick={(t) => void navigate(`tests/${t.id}`)}
          />
          <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
        </>
      )}
    </QueryState>
  );
}

function DefectsList({ values, update }: ListProps) {
  const project = useCurrentProject();
  const navigate = useNavigate();
  const params = {
    q: values.q || undefined,
    severityId: values.severityId || undefined,
    statusId: values.statusId || undefined,
    open: values.state === 'open' ? true : values.state === 'closed' ? false : undefined,
    sort: ['code', 'targetFixDate', 'severity', 'updatedAt'].includes(values.sort)
      ? values.sort
      : 'updatedAt',
    dir: values.dir,
    page: values.page,
  };
  const { data, isLoading, error, refetch } = defectsApi.useList(project.id, params);
  const columns = useMemo<Column<Defect>[]>(
    () => [
      {
        key: 'title',
        header: 'Defect',
        render: (d) => (
          <span>
            <span className="text-secondary small me-2">{d.code}</span>
            <span className="fw-medium">{d.title}</span>
          </span>
        ),
      },
      {
        key: 'severity',
        header: 'Severity',
        render: (d) => <StatusBadge valueId={d.severityId} />,
      },
      { key: 'status', header: 'Status', render: (d) => <StatusBadge valueId={d.statusId} /> },
      {
        key: 'assignee',
        header: 'Assignee',
        render: (d) => <DerivedValue value={d.assigneeName} unavailable="—" />,
      },
      {
        key: 'fix',
        header: 'Target fix',
        render: (d) => <DerivedValue value={formatDate(d.targetFixDate)} unavailable="—" />,
      },
      {
        key: 'retest',
        header: 'Retest',
        render: (d) => <StatusBadge valueId={d.retestResultId} emptyLabel="—" />,
      },
    ],
    [],
  );
  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      isEmpty={data?.items.length === 0}
      emptyMessage="No defects found."
    >
      {data && (
        <>
          <DataList
            rows={data.items}
            columns={columns}
            rowKey={(d) => d.id}
            caption="Defects"
            onRowClick={(d) => void navigate(`defects/${d.id}`)}
          />
          <Pagination meta={data.meta} onPageChange={(page) => update({ page: String(page) })} />
        </>
      )}
    </QueryState>
  );
}

type ListProps = {
  values: typeof DEFAULTS & Record<string, string>;
  update: (patch: Record<string, string | undefined>) => void;
};

export function TestingListPage() {
  const project = useCurrentProject();
  const { values, update, reset } = useListParams(DEFAULTS);
  const { options } = useReferenceData();
  const isDefects = values.view === 'defects';
  const refOptions = (category: 'TEST_STAGE' | 'TEST_RESULT' | 'STATUS' | 'PRIORITY') =>
    options(category).map((v) => ({ value: String(v.id), label: v.label }));
  const hasFilters = Boolean(
    values.q ||
    values.stageId ||
    values.resultId ||
    values.statusId ||
    values.severityId ||
    values.state,
  );

  return (
    <>
      <PageHeader
        title="Testing & Defects"
        actions={
          !project.archivedAt && (
            <Link to={isDefects ? 'defects/new' : 'tests/new'} className="btn btn-primary">
              <Plus size={18} aria-hidden="true" className="me-1" />
              {isDefects ? 'New defect' : 'New test case'}
            </Link>
          )
        }
      />
      <ul className="nav nav-tabs mb-3">
        {[
          { view: 'tests', label: 'Test cases' },
          { view: 'defects', label: 'Defects' },
        ].map((tab) => (
          <li key={tab.view} className="nav-item">
            <button
              type="button"
              className={`nav-link ${values.view === tab.view ? 'active' : ''}`}
              aria-current={values.view === tab.view ? 'page' : undefined}
              onClick={() =>
                update({
                  view: tab.view,
                  resultId: '',
                  stageId: '',
                  severityId: '',
                  state: '',
                  sort: undefined,
                  dir: undefined,
                })
              }
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
      <FilterBar
        search={values.q}
        onSearch={(q) => update({ q })}
        searchPlaceholder={
          isDefects
            ? 'Search code, title, reference, assignee'
            : 'Search code, scenario, module, tester'
        }
        onClear={
          hasFilters
            ? () => {
                reset();
                update({ view: values.view });
              }
            : undefined
        }
        sort={{
          value: `${values.sort}:${values.dir}`,
          options: isDefects
            ? [
                { value: 'updatedAt:desc', label: 'Recently updated' },
                { value: 'severity:asc', label: 'Severity (highest)' },
                { value: 'targetFixDate:asc', label: 'Target fix (soonest)' },
                { value: 'code:asc', label: 'Code' },
              ]
            : [
                { value: 'updatedAt:desc', label: 'Recently updated' },
                { value: 'testDate:desc', label: 'Latest test date' },
                { value: 'code:asc', label: 'Code' },
              ],
          onChange: (value) => {
            const [sort, dir] = value.split(':');
            update({ sort, dir });
          },
        }}
      >
        {isDefects ? (
          <>
            <FilterSelect
              label="Show"
              value={values.state}
              onChange={(state) => update({ state })}
              allLabel="All defects"
              options={[
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed / inactive' },
              ]}
            />
            <FilterSelect
              label="Severity"
              value={values.severityId}
              onChange={(severityId) => update({ severityId })}
              options={refOptions('PRIORITY')}
            />
          </>
        ) : (
          <>
            <FilterSelect
              label="Stage"
              value={values.stageId}
              onChange={(stageId) => update({ stageId })}
              options={refOptions('TEST_STAGE')}
            />
            <FilterSelect
              label="Latest result"
              value={values.resultId}
              onChange={(resultId) => update({ resultId })}
              options={refOptions('TEST_RESULT')}
            />
          </>
        )}
        <FilterSelect
          label="Status"
          value={values.statusId}
          onChange={(statusId) => update({ statusId })}
          options={refOptions('STATUS')}
        />
      </FilterBar>
      {isDefects ? (
        <DefectsList values={values} update={update} />
      ) : (
        <TestsList values={values} update={update} />
      )}
    </>
  );
}
