import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import TimerWidget from '../components/time-tracking/TimerWidget.jsx';
import { calculateBudgetUsagePercentage, calculateRemainingHours, calculateWorkedAmount, calculateWorkedHours, formatCurrency, formatDate, formatMinutesToDuration } from '../utils/calculations.js';

const taskStatuses = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { state, addTask, updateTask, deleteTask, addTimeEntry, updateTimeEntry, deleteTimeEntry, updatePaymentStatus } = useAppContext();
  const project = state.projects.find((item) => item.id === projectId);
  const [taskDraft, setTaskDraft] = useState({ name: '', description: '', status: 'pending', estimatedHours: 0 });
  const [timeDraft, setTimeDraft] = useState({ date: new Date().toISOString().slice(0, 10), startTime: '09:00', endTime: '10:00', durationMinutes: 60, description: '', taskId: '' });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const projectEntries = useMemo(() => state.timeEntries.filter((entry) => entry.projectId === projectId), [state.timeEntries, projectId]);
  const projectTasks = useMemo(() => state.tasks.filter((task) => task.projectId === projectId), [state.tasks, projectId]);
  const projectPayments = useMemo(() => state.payments.filter((payment) => payment.projectId === projectId), [state.payments, projectId]);

  if (!project) {
    return <div className="page"><p>Proyecto no encontrado.</p></div>;
  }

  const workedMinutes = projectEntries.reduce((sum, entry) => sum + Number(entry.durationMinutes || 0), 0);
  const workedHours = calculateWorkedHours(workedMinutes);
  const remainingHours = calculateRemainingHours(project.estimatedHours, workedHours);
  const earnedAmount = calculateWorkedAmount(workedHours, project.hourlyRate);
  const paidAmount = projectPayments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingAmount = projectPayments.filter((payment) => payment.status !== 'paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const budgetUsage = calculateBudgetUsagePercentage(project.estimatedHours, workedHours);
  const paymentProgress = projectPayments.length ? (paidAmount / project.agreedBudget) * 100 : 0;

  const handleTaskSubmit = (event) => {
    event.preventDefault();
    addTask({ ...taskDraft, projectId: project.id });
    setTaskDraft({ name: '', description: '', status: 'pending', estimatedHours: 0 });
  };

  const handleTimeSubmit = (event) => {
    event.preventDefault();
    addTimeEntry({ ...timeDraft, projectId: project.id, durationMinutes: Number(timeDraft.durationMinutes || 0), taskId: timeDraft.taskId || '' });
  };

  const handlePaymentToggle = (paymentId, currentStatus) => {
    updatePaymentStatus(paymentId, currentStatus === 'paid' ? 'pending' : 'paid', currentStatus === 'paid' ? '' : new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Detalle del proyecto</p>
          <h2>{project.name}</h2>
          <p>{project.clientName}</p>
        </div>
      </div>

      <section className="stats-grid">
        <article className="summary-card">
          <p>Cliente</p>
          <strong>{project.clientName}</strong>
        </article>
        <article className="summary-card">
          <p>Estado</p>
          <strong>{project.status}</strong>
        </article>
        <article className="summary-card">
          <p>Horas trabajadas</p>
          <strong>{workedHours.toFixed(2)} h</strong>
        </article>
        <article className="summary-card">
          <p>Importe generado</p>
          <strong>{formatCurrency(earnedAmount, state.settings.currency)}</strong>
        </article>
        <article className="summary-card">
          <p>Importe cobrado</p>
          <strong>{formatCurrency(paidAmount, state.settings.currency)}</strong>
        </article>
        <article className="summary-card">
          <p>Importe pendiente</p>
          <strong>{formatCurrency(pendingAmount, state.settings.currency)}</strong>
        </article>
      </section>

      <TimerWidget />

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header"><h3>Indicadores</h3></div>
          <div className="progress-stack">
            <div>
              <label>Horas consumidas</label>
              <div className="progress-bar"><div style={{ width: `${Math.min(100, budgetUsage)}%` }} /></div>
              <small>{budgetUsage.toFixed(0)}%</small>
            </div>
            <div>
              <label>Importe generado</label>
              <div className="progress-bar"><div style={{ width: `${Math.min(100, (earnedAmount / project.agreedBudget) * 100)}%` }} /></div>
              <small>{((earnedAmount / project.agreedBudget) * 100).toFixed(0)}%</small>
            </div>
            <div>
              <label>Pagos cobrados</label>
              <div className="progress-bar"><div style={{ width: `${Math.min(100, paymentProgress)}%` }} /></div>
              <small>{paymentProgress.toFixed(0)}%</small>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header"><h3>Tareas</h3></div>
          <form className="form-grid compact" onSubmit={handleTaskSubmit}>
            <label>
              <span>Nombre</span>
              <input value={taskDraft.name} onChange={(event) => setTaskDraft({ ...taskDraft, name: event.target.value })} required />
            </label>
            <label>
              <span>Estado</span>
              <select value={taskDraft.status} onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value })}>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Completada</option>
              </select>
            </label>
            <label>
              <span>Horas estimadas</span>
              <input type="number" value={taskDraft.estimatedHours} onChange={(event) => setTaskDraft({ ...taskDraft, estimatedHours: event.target.value })} />
            </label>
            <label className="full-width">
              <span>Descripción</span>
              <textarea value={taskDraft.description} onChange={(event) => setTaskDraft({ ...taskDraft, description: event.target.value })} />
            </label>
            <button className="button primary" type="submit">Añadir tarea</button>
          </form>
          <ul className="stack-list">
            {projectTasks.map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.name}</strong>
                  <p>{task.description}</p>
                </div>
                <div className="row-actions">
                  <button className="text-button" onClick={() => updateTask({ ...task, status: task.status === 'completed' ? 'pending' : 'completed' })}>Actualizar</button>
                  <button className="text-button" onClick={() => deleteTask(task.id)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card">
        <div className="card-header"><h3>Registrar horas</h3></div>
        <form className="form-grid compact" onSubmit={handleTimeSubmit}>
          <label>
            <span>Fecha</span>
            <input type="date" value={timeDraft.date} onChange={(event) => setTimeDraft({ ...timeDraft, date: event.target.value })} />
          </label>
          <label>
            <span>Hora inicio</span>
            <input value={timeDraft.startTime} onChange={(event) => setTimeDraft({ ...timeDraft, startTime: event.target.value })} />
          </label>
          <label>
            <span>Hora fin</span>
            <input value={timeDraft.endTime} onChange={(event) => setTimeDraft({ ...timeDraft, endTime: event.target.value })} />
          </label>
          <label>
            <span>Tarea</span>
            <select value={timeDraft.taskId} onChange={(event) => setTimeDraft({ ...timeDraft, taskId: event.target.value })}>
              <option value="">Sin tarea</option>
              {projectTasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </select>
          </label>
          <label className="full-width">
            <span>Descripción</span>
            <textarea value={timeDraft.description} onChange={(event) => setTimeDraft({ ...timeDraft, description: event.target.value })} />
          </label>
          <label>
            <span>Duración (minutos)</span>
            <input type="number" value={timeDraft.durationMinutes} onChange={(event) => setTimeDraft({ ...timeDraft, durationMinutes: event.target.value })} />
          </label>
          <button className="button primary" type="submit">Guardar entrada</button>
        </form>
      </section>

      <section className="card">
        <div className="card-header"><h3>Historial de horas</h3></div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Duración</th>
              <th>Tarea</th>
              <th>Descripción</th>
              <th>Importe</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {projectEntries.map((entry) => {
              const task = projectTasks.find((item) => item.id === entry.taskId);
              return (
                <tr key={entry.id}>
                  <td>
                    {editingId === entry.id ? (
                      <input type="date" value={editValues.date || ''} onChange={(e) => setEditValues({ ...editValues, date: e.target.value })} />
                    ) : (
                      formatDate(entry.date)
                    )}
                  </td>
                  <td>
                    {editingId === entry.id ? (
                      <input type="number" value={editValues.durationMinutes || 0} onChange={(e) => setEditValues({ ...editValues, durationMinutes: e.target.value })} />
                    ) : (
                      formatMinutesToDuration(entry.durationMinutes)
                    )}
                  </td>
                  <td>{task?.name ?? 'General'}</td>
                  <td>
                    {editingId === entry.id ? (
                      <textarea value={editValues.description || ''} onChange={(e) => setEditValues({ ...editValues, description: e.target.value })} />
                    ) : (
                      entry.description
                    )}
                  </td>
                  <td>{formatCurrency(calculateWorkedAmount(calculateWorkedHours(entry.durationMinutes), project.hourlyRate), state.settings.currency)}</td>
                  <td>
                    {editingId === entry.id ? (
                      <>
                        <button className="text-button" onClick={() => {
                          const payload = { ...entry, ...editValues, durationMinutes: Number(editValues.durationMinutes || 0) };
                          updateTimeEntry(payload);
                          setEditingId(null);
                          setEditValues({});
                        }}>Guardar</button>
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
      </section>

      <section className="card">
        <div className="card-header"><h3>Pagos</h3></div>
        <div className="payment-list">
          {projectPayments.map((payment) => (
            <article key={payment.id} className="payment-card">
              <div>
                <strong>{payment.label}</strong>
                <p>{payment.percentage}%</p>
              </div>
              <div>
                <strong>{formatCurrency(payment.amount, state.settings.currency)}</strong>
                <p>{payment.status === 'paid' ? 'Cobrado' : 'Pendiente'}</p>
              </div>
              <button className="button secondary" onClick={() => handlePaymentToggle(payment.id, payment.status)}>{payment.status === 'paid' ? 'Marcar pendiente' : 'Marcar cobrado'}</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
