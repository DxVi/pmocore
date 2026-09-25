import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { THEMES, type Theme } from '@/providers/theme-context';

const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  emerald: 'Emerald',
  ocean: 'Ocean',
  rustic: 'Rustic',
  etch: 'Etch',
};

const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`;

/** Authenticated application shell: responsive top navigation with a collapsible menu on phones. */
export function AppShell() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  // The menu stays open only for the path it was opened on, so navigating closes it.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === location.pathname;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <nav
        className="navbar navbar-expand-md pmo-navbar border-bottom"
        aria-label="Main navigation"
      >
        <div className="container-xl">
          <NavLink to="/" className="navbar-brand fw-semibold">
            PMOCore
          </NavLink>
          <button
            type="button"
            className="navbar-toggler border-0"
            aria-controls="main-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpenedAt(menuOpen ? null : location.pathname)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <div id="main-menu" className={`collapse navbar-collapse${menuOpen ? ' show' : ''}`}>
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <NavLink to="/" end className={navClass}>
                  Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/projects" className={navClass}>
                  Projects
                </NavLink>
              </li>
            </ul>
            <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center py-2 py-md-0">
              <label htmlFor="theme-select" className="visually-hidden">
                Theme
              </label>
              <select
                id="theme-select"
                className="form-select form-select-sm pmo-theme-select"
                value={theme}
                onChange={(event) => setTheme(event.target.value as Theme)}
              >
                {THEMES.map((value) => (
                  <option key={value} value={value}>
                    {THEME_LABELS[value]} theme
                  </option>
                ))}
              </select>
              <span className="small text-secondary text-truncate" title={user?.email}>
                {user?.displayName}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                <LogOut size={16} aria-hidden="true" className="me-1" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container-xl flex-grow-1 py-4 px-3 px-sm-4">
        <Outlet />
      </main>
    </div>
  );
}
