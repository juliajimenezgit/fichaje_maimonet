import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import { calculateElapsedMinutes, formatMinutesToDuration } from '../../utils/calculations.js';

export default function TimerWidget() {
  const { state, startTimer, pauseTimer, resumeTimer, finishTimer, cancelTimer } = useAppContext();
  const [draft, setDraft] = useState({ projectId: '', taskId: '', description: '' });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!state.activeTimer || state.activeTimer.status !== 'running') {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state.activeTimer]);

  const elapsedMinutes = useMemo(() => calculateElapsedMinutes(state.activeTimer), [state.activeTimer, now]);

  const handleStart = () => {
    startTimer({ ...draft });
  };

  const handleFinish = () => {
    finishTimer({ description: draft.description });
  };

  const handleCancel = () => {
    if (window.confirm('¿Deseas cancelar el fichaje activo?')) {
      cancelTimer();
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <h3>Temporizador</h3>
      </div>
      {!state.activeTimer ? (
        <div className="form-grid compact">
          <label>
            <span>Proyecto</span>
            <select value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}>
              <option value="">Selecciona proyecto</option>
              {state.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label>
            <span>Tarea</span>
            <select value={draft.taskId} onChange={(event) => setDraft({ ...draft, taskId: event.target.value })}>
              <option value="">Sin tarea</option>
              {state.tasks.filter((task) => task.projectId === draft.projectId).map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </select>
          </label>
          <label className="full-width">
            <span>Descripción</span>
            <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>
          <button className="button primary" onClick={handleStart}>Empezar</button>
        </div>
      ) : (
        <div className="progress-stack">
          <div>
            <strong>{formatMinutesToDuration(elapsedMinutes)}</strong>
            <p>{state.activeTimer.description}</p>
          </div>
          <div className="row-actions">
            {state.activeTimer.status === 'running' ? (
              <button className="button secondary" onClick={() => pauseTimer()}><Pause size={16} /> Pausar</button>
            ) : (
              <button className="button secondary" onClick={() => resumeTimer()}><Play size={16} /> Reanudar</button>
            )}
            <button className="button primary" onClick={handleFinish}><Square size={16} /> Finalizar</button>
            <button className="button danger" onClick={handleCancel}>Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
}
