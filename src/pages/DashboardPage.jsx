import { Link } from 'react-router-dom';
import { Briefcase, Clock3, CreditCard, PlusCircle, FolderKanban, TimerReset } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import TimerWidget from '../components/time-tracking/TimerWidget.jsx';
import { calculateWorkedAmount, calculateWorkedHours, formatCurrency, formatMinutesToDuration } from '../utils/calculations.js';

export default function DashboardPage() {
  const { state } = useAppContext();

  const today = new Date().toISOString().slice(0, 10);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().slice(0, 10);
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  const totalMinutesToday = state.timeEntries.filter((entry) => entry.date === today).reduce((sum, entry) => sum + Number(entry.durationMinutes || 0), 0);
  const totalMinutesWeek = state.timeEntries.filter((entry) => entry.date >= weekStart && entry.date <= today).reduce((sum, entry) => sum + Number(entry.durationMinutes || 0), 0);
  const totalMinutesMonth = state.timeEntries.filter((entry) => entry.date >= monthStart && entry.date <= today).reduce((sum, entry) => sum + Number(entry.durationMinutes || 0), 0);

  const monthlyAmount = state.timeEntries.filter((entry) => entry.date >= monthStart && entry.date <= today).reduce((sum, entry) => {
    const project = state.projects.find((item) => item.id === entry.projectId);
    return sum + calculateWorkedAmount(calculateWorkedHours(entry.durationMinutes), project?.hourlyRate ?? state.settings.hourlyRate);
  }, 0);

  const earned = state.payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pending = state.payments.filter((payment) => payment.status !== 'paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const topProjects = [...state.projects].map((project) => ({
    ...project,
    workedMinutes: state.timeEntries.filter((entry) => entry.projectId === project.id).reduce((sum, entry) => sum + Number(entry.durationMinutes || 0), 0),
  })).sort((a, b) => b.workedMinutes - a.workedMinutes).slice(0, 3);

  const warnings = state.projects.filter((project) => {
    const workedMinutes = state.timeEntries.filter((entry) => entry.projectId === project.id).reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
    const workedHours = calculateWorkedHours(workedMinutes);
    return project.estimatedHours > 0 && workedHours >= project.estimatedHours * 0.75;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Resumen de la actividad</h2>
        </div>
        <Link to="/projects" className="button primary">Ver proyectos</Link>
      </div>

      <section className="quick-actions">
        <Link to="/time-entries?mode=timer" className="action-card">
          <TimerReset size={18} />
          <span>Iniciar un fichaje</span>
        </Link>
        <Link to="/projects?modal=project" className="action-card">
          <PlusCircle size={18} />
          <span>Crear un proyecto</span>
        </Link>
        <Link to="/time-entries?mode=manual" className="action-card">
          <Clock3 size={18} />
          <span>Registrar horas manualmente</span>
        </Link>
        <Link to="/projects" className="action-card">
          <FolderKanban size={18} />
          <span>Consultar proyectos activos</span>
        </Link>
      </section>

      <section className="stats-grid">
        <article className="summary-card">
          <div className="summary-icon"><Briefcase size={18} /></div>
          <div>
            <p>Proyectos activos</p>
            <strong>{state.projects.filter((project) => project.status === 'active').length}</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><Clock3 size={18} /></div>
          <div>
            <p>Horas hoy</p>
            <strong>{calculateWorkedHours(totalMinutesToday).toFixed(2)} h</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><Clock3 size={18} /></div>
          <div>
            <p>Horas esta semana</p>
            <strong>{calculateWorkedHours(totalMinutesWeek).toFixed(2)} h</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><Clock3 size={18} /></div>
          <div>
            <p>Horas este mes</p>
            <strong>{calculateWorkedHours(totalMinutesMonth).toFixed(2)} h</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><CreditCard size={18} /></div>
          <div>
            <p>Importe generado mes</p>
            <strong>{formatCurrency(monthlyAmount, state.settings.currency)}</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><CreditCard size={18} /></div>
          <div>
            <p>Total pendiente</p>
            <strong>{formatCurrency(pending, state.settings.currency)}</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><CreditCard size={18} /></div>
          <div>
            <p>Total cobrado</p>
            <strong>{formatCurrency(earned, state.settings.currency)}</strong>
          </div>
        </article>
      </section>

      <TimerWidget />

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <h3>Últimas sesiones</h3>
          </div>
          <ul className="stack-list">
            {state.timeEntries.slice(0, 5).map((entry) => {
              const project = state.projects.find((item) => item.id === entry.projectId);
              return (
                <li key={entry.id}>
                  <div>
                    <strong>{project?.name ?? 'Proyecto'}</strong>
                    <p>{entry.description}</p>
                  </div>
                  <span>{formatMinutesToDuration(entry.durationMinutes)}</span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Proyectos con más horas</h3>
          </div>
          <ul className="stack-list">
            {topProjects.map((project) => (
              <li key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <p>{project.clientName}</p>
                </div>
                <span>{calculateWorkedHours(project.workedMinutes).toFixed(1)} h</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Avisos de presupuesto</h3>
          </div>
          <ul className="stack-list">
            {warnings.map((project) => {
              const workedMinutes = state.timeEntries.filter((entry) => entry.projectId === project.id).reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
              const workedHours = calculateWorkedHours(workedMinutes);
              return (
                <li key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <p>{project.clientName}</p>
                  </div>
                  <span className="warning-pill">{workedHours.toFixed(1)} / {project.estimatedHours} h</span>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </div>
  );
}
