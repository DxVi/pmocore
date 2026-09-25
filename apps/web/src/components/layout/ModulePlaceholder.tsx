import { PageHeader } from '@/components/PageHeader';

/** Stand-in page for modules delivered by later packages (tasks.md §3.3). */
export function ModulePlaceholder({
  title,
  requirementRange,
}: {
  title: string;
  requirementRange: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <div className="text-secondary border rounded py-5 px-3 text-center">
        <p className="mb-1">This module is not available yet.</p>
        <p className="small mb-0">{requirementRange}</p>
      </div>
    </>
  );
}
