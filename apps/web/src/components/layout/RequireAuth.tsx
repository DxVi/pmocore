import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/QueryState';

/** Redirects signed-out users to /login. UX only — the API enforces authentication. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) {
    return (
      <div className="container py-5">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }
  if (user === null) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}
