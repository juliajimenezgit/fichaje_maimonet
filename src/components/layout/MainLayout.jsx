import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Clock3, Settings, Moon, Sun } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import logoGrandeDark from '../../assets/logo_grande_dark.png';
import logoGrandeWhite from '../../assets/logo_grande_white.png';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Proyectos', icon: FolderKanban },
  { to: '/time-entries', label: 'Registro de horas', icon: Clock3 },
  { to: '/settings', label: 'Configuración', icon: Settings },
];

export default function MainLayout() {
  const { state } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <img src={isDark ? logoGrandeWhite : logoGrandeDark} alt="Maimonet" className="topbar-logo" />
        </div>
        <nav className="topnav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `topnav-link ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <button className="theme-toggle header-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
