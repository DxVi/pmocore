import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { DocumentDetail } from '@pmocore/shared';
import { AttachmentPanel } from '@/components/attachments/AttachmentPanel';
import { DerivedValue } from '@/components/DerivedValue';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/QueryState';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { useCurrentProject } from '@/features/projects/project-context';
import { Detail, RecordActions, TextValue } from '@/features/plan/common/ui';
import { documentsApi } from './api';

const RELATED_ROUTES: Record<NonNullable<DocumentDetail['relatedRecord']>['type'], string> = {
  requirement: 'requirements',
  activity: 'meetings',
  release: 'releases',
  workItem: 'plan',
};

export function DocumentDetailPage() {
  const project = useCurrentProject();
  const { recordId = '' } = useParams();
  const { data: doc, isLoading, error, refetch } = documentsApi.useDetail(project.id, recordId);
  const remove = documentsApi.useDelete(project.id, recordId);
  const editable = !project.archivedAt;

  if (isLoading) return <LoadingState />;
  if (error || !doc) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title={doc.title}
        code={doc.code}
        subtitle={
          <span className="d-flex flex-wrap gap-2">
            <StatusBadge valueId={doc.phaseId} emptyLabel="Phase not set" />
            {doc.documentTypeId && <StatusBadge valueId={doc.documentTypeId} />}
            <StatusBadge valueId={doc.statusId} />
          </span>
        }
        actions={
          editable && (
            <RecordActions
              entity="document"
              remove={remove}
              deleteMessage="The document and its attached files are removed. Documents used as minutes, evidence or certificates cannot be deleted."
            />
          )
        }
      />
      <div className="row g-4">
        <div className="col-lg-7">
          <section className="card" aria-label="Document details">
            <div className="card-body">
              <dl className="row mb-0">
                <Detail label="Version">
                  <TextValue value={doc.docVersion} />
                </Detail>
                <Detail label="Owner">
                  <TextValue value={doc.ownerName} />
                </Detail>
                <Detail label="Document date">
                  <DerivedValue value={formatDate(doc.documentDate)} unavailable="—" />
                </Detail>
                <Detail label="External link" wide>
                  {doc.linkUrl ? (
                    <a
                      href={doc.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-break"
                    >
                      <ExternalLink size={14} aria-hidden="true" className="me-1" />
                      {doc.linkUrl}
                    </a>
                  ) : (
                    <span className="text-secondary">No link</span>
                  )}
                </Detail>
                <Detail label="Related record" wide>
                  {doc.relatedRecord ? (
                    <Link
                      to={`../../${RELATED_ROUTES[doc.relatedRecord.type]}/${doc.relatedRecord.id}`}
                      relative="path"
                    >
                      {doc.relatedRecord.code} · {doc.relatedRecord.title}
                    </Link>
                  ) : (
                    <span className="text-secondary">None</span>
                  )}
                </Detail>
                <Detail label="Remarks" wide>
                  <TextValue value={doc.remarks} />
                </Detail>
              </dl>
            </div>
          </section>
        </div>
        <div className="col-lg-5">
          {/* Shared attachment service (PKG-2 implementation) with parentType="document" (REQ-061). */}
          <AttachmentPanel
            projectId={project.id}
            parentType="document"
            parentId={doc.id}
            editable={editable}
          />
        </div>
      </div>
    </>
  );
}
