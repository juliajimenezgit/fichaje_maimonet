import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { calculateBudgetUsagePercentage, calculateRemainingHours, calculateWorkedAmount, calculateWorkedHours, formatCurrency, formatDate } from '../utils/calculations.js';

const statusOptions = ['all', 'pending', 'active', 'paused', 'finished', 'cancelled'];
const statusLabels = {
  pending: 'Pendiente',
  active: 'Activo',
  paused: 'En pausa',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

export default function ProjectsPage() {
  const { state, addProject, updateProject, deleteProject } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showCompleted, setShowCompleted] = useState('all');
  const [draft, setDraft] = useState({
    name: '',
    clientName: '',
    description: '',
    status: 'active',
    startDate: new Date().toISOString().slice(0, 10),
    estimatedEndDate: '',
    hourlyRate: state.settings.hourlyRate,
    estimatedHours: 0,
    agreedBudget: 0,
    budgetNotes: '',
  });

  const filteredProjects = useMemo(() => {
    return state.projects.filter((project) => {
      const workedMinutes = state.timeEntries.filter((entry) => entry.projectId === project.id).reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
      const workedHours = calculateWorkedHours(workedMinutes);
      const matchesSearch = `${project.name} ${project.clientName}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesClient = clientFilter === 'all' || project.clientName === clientFilter;
      const matchesDate = !dateFilter || project.startDate >= dateFilter || project.estimatedEndDate >= dateFilter;
      const matchesCompletion = showCompleted === 'all' || (showCompleted === 'active' ? project.status === 'active' : project.status === 'finished');
      return matchesSearch && matchesStatus && matchesClient && matchesDate && matchesCompletion;
    });
  }, [state.projects, state.timeEntries, search, statusFilter, clientFilter, dateFilter, showCompleted]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = addProject({ ...draft });
    if (result.success) {
      setDraft({
        name: '',
        clientName: '',
        description: '',
        status: 'active',
        startDate: new Date().toISOString().slice(0, 10),
        estimatedEndDate: '',
        hourlyRate: state.settings.hourlyRate,
        estimatedHours: 0,
        agreedBudget: 0,
        budgetNotes: '',
      });
    }
  };

  const handleDelete = (projectId) => {
    const result = deleteProject(projectId);
    if (!result.success) {
      window.alert(result.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Proyectos</p>
          <h2>Gestión de proyectos</h2>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="card-header">
          <h3>Crear proyecto</h3>
        </div>
        <div className="form-grid">
          <label>
            <span>Nombre del proyecto</span>
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
          </label>
          <label>
            <span>Cliente</span>
            <input value={draft.clientName} onChange={(event) => setDraft({ ...draft, clientName: event.target.value })} required />
          </label>
          <label>
            <span>Estado</span>
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Fecha de inicio</span>
            <input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
          </label>
          <label>
            <span>Fecha prevista</span>
            <input type="date" value={draft.estimatedEndDate} onChange={(event) => setDraft({ ...draft, estimatedEndDate: event.target.value })} />
          </label>
          <label>
            <span>Tarifa por hora</span>
            <input type="number" value={draft.hourlyRate} onChange={(event) => setDraft({ ...draft, hourlyRate: event.target.value })} />
          </label>
          <label>
            <span>Horas presupuestadas</span>
            <input type="number" value={draft.estimatedHours} onChange={(event) => setDraft({ ...draft, estimatedHours: event.target.value })} />
          </label>
          <label>
            <span>Presupuesto final acordado</span>
            <input type="number" value={draft.agreedBudget} onChange={(event) => setDraft({ ...draft, agreedBudget: event.target.value })} />
          </label>
          <label className="full-width">
            <span>Descripción</span>
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>
          <label className="full-width">
            <span>Notas del presupuesto</span>
            <textarea value={draft.budgetNotes} onChange={(event) => setDraft({ ...draft, budgetNotes: event.target.value })} />
          </label>
        </div>
        <button className="button primary" type="submit">Guardar proyecto</button>
      </form>

      <section className="card">
        <div className="card-header">
          <h3>Listado de proyectos</h3>
        </div>
        <div className="filters-grid">
          <label>
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por proyecto o cliente" />
          </label>
          <label>
            <Filter size={16} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Cliente</span>
            <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
              <option value="all">Todos</option>
              {[...new Set(state.projects.map((project) => project.clientName))].map((client) => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Fecha</span>
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          <label>
            <span>Tipo</span>
            <select value={showCompleted} onChange={(event) => setShowCompleted(event.target.value)}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="finished">Finalizados</option>
            </select>
          </label>
        </div>
        <div className="project-list">
          {filteredProjects.map((project) => {
            const workedMinutes = state.timeEntries.filter((entry) => entry.projectId === project.id).reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
            const workedHours = calculateWorkedHours(workedMinutes);
            const remainingHours = calculateRemainingHours(project.estimatedHours, workedHours);
            const budgetUsage = calculateBudgetUsagePercentage(project.estimatedHours, workedHours);
            const generatedAmount = calculateWorkedAmount(workedHours, project.hourlyRate);
            const statusLabel = statusLabels[project.status] || project.status;
            return (
              <article key={project.id} className="project-card">
                <div className="project-card-head">
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.clientName}</p>
                  </div>
                  <span className={`status-badge ${project.status}`}>{statusLabel}</span>
                </div>
                <div className="project-card-grid">
                  <div><span>Inicio</span><strong>{formatDate(project.startDate)}</strong></div>
                  <div><span>Fin prevista</span><strong>{formatDate(project.estimatedEndDate)}</strong></div>
                  <div><span>Horas pres.</span><strong>{project.estimatedHours}</strong></div>
                  <div><span>Horas trab.</span><strong>{workedHours.toFixed(2)}</strong></div>
                  <div><span>Horas rest.</span><strong>{remainingHours.toFixed(2)}</strong></div>
                  <div><span>Presupuesto</span><strong>{formatCurrency(project.agreedBudget, state.settings.currency)}</strong></div>
                  <div><span>Importe</span><strong>{formatCurrency(generatedAmount, state.settings.currency)}</strong></div>
                  <div><span>Consumo</span><strong>{budgetUsage.toFixed(0)}%</strong></div>
                </div>
                <div className="card-actions">
                  <Link to={`/projects/${project.id}`} className="button secondary">Ver detalle</Link>
                  <button className="button danger" onClick={() => handleDelete(project.id)}>Eliminar</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
