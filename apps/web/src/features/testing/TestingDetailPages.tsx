import { Link, useParams } from 'react-router-dom';
import { Bug } from 'lucide-react';
import type { RecordRef } from '@pmocore/shared';
import { DerivedValue } from '@/components/DerivedValue';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { Detail, RecordActions, TextValue } from '@/features/plan/common/ui';
import { defectsApi, testsApi } from './api';

const date = (value: string | null) => <DerivedValue value={formatDate(value)} unavailable="—" />;

function RefLink({
  to,
  item,
  empty = '—',
}: {
  to: string;
  item: RecordRef | null;
  empty?: string;
}) {
  if (!item) return <span className="text-secondary">{empty}</span>;
  return (
    <Link to={to} relative="path">
      {item.code} · {item.title}
    </Link>
  );
}

export function TestCaseDetailPage() {
  const project = useCurrentProject();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = testsApi.useDetail(project.id, recordId);
  const remove = testsApi.useDelete(project.id, recordId);
  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const logDefect = `../../defects/new?${new URLSearchParams({
    testCase: item.id,
    testCode: item.code,
    testTitle: item.scenario.slice(0, 160),
  }).toString()}`;

  return (
    <>
      <PageHeader
        title={item.scenario}
        code={item.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2">
            <StatusBadge valueId={item.stageId} emptyLabel="Stage not set" />
            <StatusBadge valueId={item.resultId} emptyLabel="Not run" />
            <StatusBadge valueId={item.statusId} />
          </span>
        }
        actions={
          !project.archivedAt && (
            <RecordActions
              entity="test case"
              remove={remove}
              afterDelete="../.."

              deleteMessage="Test cases with defects cannot be deleted."
            />
          )
        }
      />
      <section className="card mb-4" aria-label="Test case details">
        <div className="card-body">
          <dl className="row mb-0">
            <Detail label="Requirement">
              <RefLink
                to={`../../../requirements/${item.requirement?.id ?? ''}`}
                item={item.requirement}
              />
            </Detail>
            <Detail label="Module">
              <TextValue value={item.module} />
            </Detail>
            <Detail label="Tester">
              <TextValue value={item.testerName} />
            </Detail>
            <Detail label="Test date">{date(item.testDate)}</Detail>
            <Detail label="Expected result" wide>
              <TextValue value={item.expectedResult} />
            </Detail>
            <Detail label="Actual result (latest)" wide>
              <TextValue value={item.actualResult} />
            </Detail>
            <Detail label="Evidence" wide>
              <TextValue value={item.evidence} />
            </Detail>
            <Detail label="Remarks" wide>
              <TextValue value={item.remarks} />
            </Detail>
          </dl>
        </div>
      </section>
      <section className="card" aria-labelledby="tc-defects">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 id="tc-defects" className="h5 mb-0">
              Defects
            </h2>
            {!project.archivedAt && (
              <Link to={logDefect} relative="path" className="btn btn-sm btn-outline-primary">
                <Bug size={16} aria-hidden="true" className="me-1" />
                Log defect
              </Link>
            )}
          </div>
          {item.defects.length === 0 ? (
            <p className="text-secondary mb-0">No defects logged for this test.</p>
          ) : (
            <ul className="list-group">
              {item.defects.map((d) => (
                <li
                  key={d.id}
                  className="list-group-item d-flex flex-wrap gap-2 align-items-center"
                >
                  <Link to={`../../defects/${d.id}`} relative="path" className="me-auto">
                    <span className="text-secondary small me-2">{d.code}</span>
                    {d.title}
                  </Link>
                  <StatusBadge valueId={d.statusId} />
                  {d.retestResultId && (
                    <span className="small text-secondary d-inline-flex gap-1 align-items-center">
                      Retest <StatusBadge valueId={d.retestResultId} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

export function DefectDetailPage() {
  const project = useCurrentProject();
  const { recordId = '' } = useParams();
  const { data: item, isLoading, error, refetch } = defectsApi.useDetail(project.id, recordId);
  const remove = defectsApi.useDelete(project.id, recordId);
  if (isLoading) return <LoadingState />;
  if (error || !item) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title={item.title}
        code={item.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2">
            <StatusBadge valueId={item.severityId} emptyLabel="Severity not set" />
            <StatusBadge valueId={item.statusId} />
          </span>
        }
        actions={
          !project.archivedAt && (
            <RecordActions
              entity="defect"
              remove={remove}
              afterDelete="../..?view=defects"

              deleteMessage="Defects included in a release cannot be deleted."
            />
          )
        }
      />
      <section className="card" aria-label="Defect details">
        <div className="card-body">
          <dl className="row mb-0">
            <Detail label="Found by test">
              <RefLink
                to={`../../tests/${item.testCase?.id ?? ''}`}
                item={item.testCase}
                empty="Not linked to a test"
              />
            </Detail>
            <Detail label="Defect reference">
              <TextValue value={item.externalRef} />
            </Detail>
            <Detail label="Assignee">
              <TextValue value={item.assigneeName} />
            </Detail>
            <Detail label="Target fix date">{date(item.targetFixDate)}</Detail>
            <Detail label="Fix version (planned)">
              <RefLink
                to={`../../../releases/${item.targetFixRelease?.id ?? ''}`}
                item={item.targetFixRelease}
              />
            </Detail>
            <Detail label="Retest">
              <span className="d-inline-flex flex-wrap gap-2 align-items-center">
                {date(item.retestDate)}
                <StatusBadge valueId={item.retestResultId} emptyLabel="Not retested" />
              </span>
            </Detail>
            <Detail label="Description" wide>
              <TextValue value={item.description} />
            </Detail>
            <Detail label="Remarks" wide>
              <TextValue value={item.remarks} />
            </Detail>
            <Detail label="Fixed in releases" wide>
              {item.fixedIn.length === 0 ? (
                <span className="text-secondary">Not included in a release yet.</span>
              ) : (
                <ul className="list-unstyled mb-0">
                  {item.fixedIn.map((r) => (
                    <li key={r.id}>
                      <RefLink to={`../../../releases/${r.id}`} item={r} />
                      {r.note && <span className="small text-secondary ms-2">{r.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Detail>
          </dl>
        </div>
      </section>
    </>
  );
}
