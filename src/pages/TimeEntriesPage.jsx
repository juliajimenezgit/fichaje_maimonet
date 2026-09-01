import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { calculateWorkedAmount, calculateWorkedHours, formatCurrency, formatDate, formatMinutesToDuration } from '../utils/calculations.js';

export default function TimeEntriesPage() {
  const { state, updateTimeEntry, deleteTimeEntry } = useAppContext();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [filterProject, setFilterProject] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterTask, setFilterTask] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredEntries = useMemo(() => state.timeEntries.filter((entry) => {
    const project = state.projects.find((item) => item.id === entry.projectId);
    const task = state.tasks.find((item) => item.id === entry.taskId);
    const matchesProject = filterProject === 'all' || entry.projectId === filterProject;
    const matchesClient = filterClient === 'all' || project?.clientName === filterClient;
    const matchesTask = filterTask === 'all' || entry.taskId === filterTask;
    const matchesFrom = !dateFrom || entry.date >= dateFrom;
    const matchesTo = !dateTo || entry.date <= dateTo;
    return matchesProject && matchesClient && matchesTask && matchesFrom && matchesTo;
  }), [state.timeEntries, state.projects, state.tasks, filterProject, filterClient, filterTask, dateFrom, dateTo]);

  const totalMinutes = filteredEntries.reduce((sum, entry) => sum + Number(entry.durationMinutes || 0), 0);
  const totalAmount = filteredEntries.reduce((sum, entry) => {
    const project = state.projects.find((item) => item.id === entry.projectId);
    return sum + calculateWorkedAmount(calculateWorkedHours(entry.durationMinutes), project?.hourlyRate ?? state.settings.hourlyRate);
  }, 0);

  const exportCsv = () => {
    const header = ['Fecha', 'Proyecto', 'Cliente', 'Tarea', 'Descripción', 'Duración', 'Tarifa', 'Importe'];
    const rows = filteredEntries.map((entry) => {
      const project = state.projects.find((item) => item.id === entry.projectId);
      const task = state.tasks.find((item) => item.id === entry.taskId);
      return [entry.date, project?.name ?? '', project?.clientName ?? '', task?.name ?? '', entry.description, formatMinutesToDuration(entry.durationMinutes), `${project?.hourlyRate ?? state.settings.hourlyRate}`, formatCurrency(calculateWorkedAmount(calculateWorkedHours(entry.durationMinutes), project?.hourlyRate ?? state.settings.hourlyRate), state.settings.currency)];
    });
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'registros.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Registros</p>
          <h2>Historial de horas</h2>
        </div>
        <button className="button secondary" onClick={exportCsv}><Download size={16} /> Exportar CSV</button>
      </div>
      <section className="card">
        <div className="filters-grid">
          <label>
            <span>Proyecto</span>
            <select value={filterProject} onChange={(event) => setFilterProject(event.target.value)}>
              <option value="all">Todos</option>
              {state.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label>
            <span>Cliente</span>
            <select value={filterClient} onChange={(event) => setFilterClient(event.target.value)}>
              <option value="all">Todos</option>
              {[...new Set(state.projects.map((project) => project.clientName))].map((client) => <option key={client} value={client}>{client}</option>)}
            </select>
          </label>
          <label>
            <span>Tarea</span>
            <select value={filterTask} onChange={(event) => setFilterTask(event.target.value)}>
              <option value="all">Todas</option>
              {state.tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </select>
          </label>
          <label>
            <span>Desde</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proyecto</th>
              <th>Cliente</th>
              <th>Tarea</th>
              <th>Descripción</th>
              <th>Duración</th>
              <th>Tarifa</th>
              <th>Importe</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => {
              const project = state.projects.find((item) => item.id === entry.projectId);
              const task = state.tasks.find((item) => item.id === entry.taskId);
              const amount = calculateWorkedAmount(calculateWorkedHours(entry.durationMinutes), project?.hourlyRate ?? state.settings.hourlyRate);
              return (
                <tr key={entry.id}>
                  <td>
                    {editingId === entry.id ? (
                      <input type="date" value={editValues.date || ''} onChange={(e) => setEditValues({ ...editValues, date: e.target.value })} />
                    ) : (
                      formatDate(entry.date)
                    )}
                  </td>
                  <td>{project?.name ?? ''}</td>
                  <td>{project?.clientName ?? ''}</td>
                  <td>{task?.name ?? 'General'}</td>
                  <td>
                    {editingId === entry.id ? (
                      <textarea value={editValues.description || ''} onChange={(e) => setEditValues({ ...editValues, description: e.target.value })} />
                    ) : (
                      entry.description
                    )}
                  </td>
                  <td>
                    {editingId === entry.id ? (
                      <input type="number" value={editValues.durationMinutes || 0} onChange={(e) => setEditValues({ ...editValues, durationMinutes: e.target.value })} />
                    ) : (
                      formatMinutesToDuration(entry.durationMinutes)
                    )}
                  </td>
                  <td>{formatCurrency(project?.hourlyRate ?? state.settings.hourlyRate, state.settings.currency)}</td>
                  <td>{formatCurrency(amount, state.settings.currency)}</td>
                  <td>
                    {editingId === entry.id ? (
                      <>
                        <button className="text-button" onClick={() => { updateTimeEntry({ ...editValues, durationMinutes: Number(editValues.durationMinutes || 0) }); setEditingId(null); }}>Guardar</button>
                        <button className="text-button" onClick={() => { setEditingId(null); setEditValues({}); }}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="text-button" onClick={() => { setEditingId(entry.id); setEditValues({ ...entry }); }}>Editar</button>
                        <button className="text-button" onClick={() => deleteTimeEntry(entry.id)}>Eliminar</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="totals-row">
          <strong>Total horas filtradas: {calculateWorkedHours(totalMinutes).toFixed(2)} h</strong>
          <strong>Total económico filtrado: {formatCurrency(totalAmount, state.settings.currency)}</strong>
        </div>
      </section>
    </div>
  );
}
