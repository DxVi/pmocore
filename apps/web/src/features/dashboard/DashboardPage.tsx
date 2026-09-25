import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';

/**
 * Dashboard placeholder. Operational metrics (REQ-006–011) are delivered in PKG-4;
 * until then this page routes the user to their projects.
 */
export function DashboardPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Dashboard" subtitle={user ? `Welcome, ${user.displayName}` : undefined} />
      <div className="card">
        <div className="card-body">
          <p className="mb-3">Operational dashboard metrics will appear here in a later release.</p>
          <Link to="/projects" className="btn btn-primary">
            Go to projects
          </Link>
        </div>
      </div>
    </>
  );
}
