import type { HealthResponse } from '@pmocore/shared';

const initialHealth: Pick<HealthResponse, 'status'> = {
  status: 'healthy',
};

export default function App() {
  return (
    <main className="container-fluid min-vh-100 px-3 py-4 px-sm-4 py-sm-5">
      <div className="mx-auto w-100" style={{ maxWidth: '72rem' }}>
        <header className="border-bottom pb-3 mb-4">
          <p className="text-uppercase text-secondary fw-semibold small mb-2">
            Project Management &amp; Operations
          </p>
          <h1 className="display-6 fw-semibold mb-2">PMOCore</h1>
          <p className="text-secondary mb-0">
            Enterprise application foundation is operational.
          </p>
        </header>

        <section className="card shadow-sm" aria-labelledby="platform-status-heading">
          <div className="card-body p-3 p-sm-4">
            <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 justify-content-between">
              <div>
                <h2 id="platform-status-heading" className="h5 mb-1">
                  Platform status
                </h2>
                <p className="text-secondary mb-0">Health monitoring is ready for integration.</p>
              </div>
              <span className="badge text-bg-success align-self-start align-self-sm-center">
                {initialHealth.status === 'healthy' ? 'Operational' : 'Degraded'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
