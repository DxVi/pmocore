import type { HealthResponse } from '@pmocore/shared';
import { useTheme } from '@/hooks/useTheme';
import { THEMES, type Theme } from '@/providers/theme-context';

const initialHealth: Pick<HealthResponse, 'status'> = {
  status: 'healthy',
};

const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  emerald: 'Emerald',
  ocean: 'Ocean',
  rustic: 'Rustic',
  etch: 'Etch',
};

export default function App() {
  const { theme, setTheme } = useTheme();

  return (
    <main className="container-fluid min-vh-100 px-3 py-4 px-sm-4 py-sm-5">
      <div className="mx-auto w-100" style={{ maxWidth: '72rem' }}>
        <header className="border-bottom pb-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
          <div>
            <p className="text-uppercase text-secondary fw-semibold small mb-2">
              Project Management &amp; Operations
            </p>
            <h1 className="display-6 fw-semibold mb-2">PMOCore</h1>
            <p className="text-secondary mb-0">Enterprise application foundation is operational.</p>
          </div>

          <div className="d-flex flex-column" style={{ minWidth: '10rem' }}>
            <label htmlFor="theme-select" className="form-label small text-secondary mb-1">
              Theme
            </label>
            <select
              id="theme-select"
              className="form-select form-select-sm"
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
            >
              {THEMES.map((value) => (
                <option key={value} value={value}>
                  {THEME_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
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
