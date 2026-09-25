import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="h3">Page not found</h1>
      <p className="text-secondary">The page you requested does not exist or is not available.</p>
      <Link to="/" className="btn btn-primary">
        Go to dashboard
      </Link>
    </div>
  );
}
