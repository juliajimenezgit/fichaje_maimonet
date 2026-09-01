import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Check, ChevronRight, Clock3, FileText, FolderOpen, ListChecks, Moon, Pencil, Plus, Sun, Trash2, Upload, X } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { deletePdf, getPdf, savePdf } from './services/documentStorage.js';
import { extractTasksFromPdf } from './services/pdfTaskExtractor.js';
import logoDark from './assets/logo_grande_dark.png';
import logoWhite from './assets/logo_grande_white.png';
import seedData from './data/seedData.json';
import './App.css';

const STORAGE_KEY = 'maimonet-simple-hours-v2';
const INITIAL_PROJECTS = [
  { id: 'qth-sutan', name: 'QTH Sutan', actas: [], budgets: [], workTasks: [] },
  { id: 'maimonet', name: 'Maimonet', actas: [], budgets: [], workTasks: [] },
];
const pad = (value) => String(value).padStart(2, '0');
const dateValue = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeValue = (date = new Date()) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const formatClock = (timestamp) => new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
const formatDate = (value) => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const formatDuration = (milliseconds) => { const minutes = Math.max(0, Math.round(milliseconds / 60000)); return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${pad(minutes % 60)} min` : `${minutes} min`; };
const formatLive = (milliseconds) => { const seconds = Math.max(0, Math.floor(milliseconds / 1000)); return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`; };

function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(localStorage.getItem('maimonet-simple-hours-v1'));
    if (stored?.projects?.length) {
      return { entries: stored.entries || [], activeTimer: stored.activeTimer || null, projects: stored.projects };
    }
    // Si no hay datos en localStorage, cargar seedData
    return seedData;
  } catch { 
    return seedData;
  }
}

function HoursApp() {
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState(loadData);
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0].id);
  const [task, setTask] = useState('');
  const [taskSubtasks, setTaskSubtasks] = useState([]);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(() => data.activeTimer?.startedAt || 0);
  const [manual, setManual] = useState({ date: dateValue(), startTime: '', endTime: '', task: '', subtasks: [], projectId: data.projects[0].id });
  const [newProject, setNewProject] = useState({ name: '', actas: [], budgets: [] });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [taskProjectId, setTaskProjectId] = useState(null);
  const [newWorkTask, setNewWorkTask] = useState('');
  const [newWorkSubtasks, setNewWorkSubtasks] = useState([]);
  const [historyFilters, setHistoryFilters] = useState({});
  const [historySorts, setHistorySorts] = useState({});

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);
  useEffect(() => {
    if (!data.activeTimer) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [data.activeTimer]);

  const projectName = (id) => data.projects.find((project) => project.id === id)?.name || 'Proyecto eliminado';
  const selectedTotal = useMemo(() => data.entries.filter((entry) => entry.projectId === selectedProjectId || entry.clientId === selectedProjectId).reduce((total, entry) => total + entry.durationMs, 0), [data.entries, selectedProjectId]);

  const start = () => {
    if (!task.trim()) return setMessage('Escribe primero qué tarea vas a realizar.');
    const startedAt = Date.now();
    setData((current) => ({ ...current, activeTimer: { startedAt, task: task.trim(), subtasks: taskSubtasks.map((item) => item.trim()).filter(Boolean), projectId: selectedProjectId } }));
    setMessage('');
  };
  const finish = () => {
    const timer = data.activeTimer;
    if (!timer) return;
    const endedAt = Date.now();
    const projectId = timer.projectId || timer.clientId;
    const linkedTask = (data.projects.find((project) => project.id === projectId)?.workTasks || []).find((item) => item.title.trim().toLowerCase() === timer.task.trim().toLowerCase());
    const workTaskId = linkedTask?.id || crypto.randomUUID();
    const entry = { id: crypto.randomUUID(), projectId, workTaskId, task: timer.task, subtasks: timer.subtasks || [], taskStatus: linkedTask?.status || (linkedTask?.done ? 'done' : 'todo'), date: dateValue(new Date(timer.startedAt)), startTime: timeValue(new Date(timer.startedAt)), endTime: timeValue(new Date(endedAt)), durationMs: endedAt - timer.startedAt, source: 'timer' };
    setData((current) => ({ ...current, entries: [entry, ...current.entries], activeTimer: null, projects: linkedTask ? current.projects : current.projects.map((project) => project.id === projectId ? { ...project, workTasks: [...(project.workTasks || []), { id: workTaskId, title: timer.task, subtasks: timer.subtasks || [], status: 'todo', done: false, createdAt: Date.now(), source: 'Fichaje de horas' }] } : project) }));
    setTask(''); setTaskSubtasks([]);
  };
  const saveManual = (event) => {
    event.preventDefault();
    const startDate = new Date(`${manual.date}T${manual.startTime}:00`);
    const endDate = new Date(`${manual.date}T${manual.endTime}:00`);
    if (!manual.task.trim() || !manual.startTime || !manual.endTime || endDate <= startDate) return setMessage('Completa la tarea y usa una hora de fin posterior a la de inicio.');
    const linkedTask = (data.projects.find((project) => project.id === manual.projectId)?.workTasks || []).find((item) => item.title.trim().toLowerCase() === manual.task.trim().toLowerCase());
    const previousEntry = editingEntryId ? data.entries.find((item) => item.id === editingEntryId) : null;
    const workTaskId = previousEntry?.workTaskId || linkedTask?.id || crypto.randomUUID();
    const subtasks = (manual.subtasks || []).map((item) => item.trim()).filter(Boolean);
    const entry = { ...manual, id: editingEntryId || crypto.randomUUID(), workTaskId, task: manual.task.trim(), subtasks, taskStatus: previousEntry?.taskStatus || linkedTask?.status || (linkedTask?.done ? 'done' : 'todo'), durationMs: endDate - startDate, source: 'manual' };
    setData((current) => ({ ...current, entries: editingEntryId ? current.entries.map((item) => item.id === editingEntryId ? entry : item) : [entry, ...current.entries], projects: linkedTask || previousEntry?.workTaskId ? current.projects : current.projects.map((project) => project.id === manual.projectId ? { ...project, workTasks: [...(project.workTasks || []), { id: workTaskId, title: manual.task.trim(), subtasks, status: 'todo', done: false, createdAt: Date.now(), source: 'Registro manual de horas' }] } : project) }));
    setManual({ date: dateValue(), startTime: '', endTime: '', task: '', subtasks: [], projectId: selectedProjectId });
    setEditingEntryId(null); setModal(null); setMessage('');
  };
  const saveProject = async (event) => {
    event.preventDefault();
    if (!newProject.name.trim()) return setMessage('Escribe el nombre de la empresa o proyecto.');
    const projectId = crypto.randomUUID();
    const storeFiles = async (files, type) => Promise.all(files.map(async (file) => {
      const id = crypto.randomUUID();
      await savePdf({ id, projectId, type, name: file.name, file, addedAt: Date.now() });
      const tasks = await extractTasksFromPdf(file).catch(() => []);
      return { document: { id, name: file.name }, tasks };
    }));
    try {
      const [actaResults, budgetResults] = await Promise.all([storeFiles(newProject.actas, 'acta'), storeFiles(newProject.budgets, 'presupuesto')]);
      const results = [...actaResults, ...budgetResults];
      const project = { id: projectId, name: newProject.name.trim(), actas: actaResults.map((item) => item.document), budgets: budgetResults.map((item) => item.document), workTasks: results.flatMap((item) => item.tasks) };
      setData((current) => ({ ...current, projects: [...current.projects, project] }));
      setSelectedProjectId(projectId); setNewProject({ name: '', actas: [], budgets: [] }); setModal(null); setMessage('');
    } catch { setMessage('No se pudieron guardar los PDF. Comprueba el espacio disponible.'); }
  };
  const openDocument = async (id) => {
    const document = await getPdf(id);
    if (!document?.file) return setMessage('No se encuentra este PDF en este dispositivo.');
    const url = URL.createObjectURL(document.file);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const updateProjectDocuments = async (event) => {
    event.preventDefault();
    if (!editingProject?.name.trim()) return setMessage('Escribe el nombre de la empresa o proyecto.');
    const storeFiles = async (files, type) => Promise.all(files.map(async (file) => {
      const id = crypto.randomUUID();
      await savePdf({ id, projectId: editingProject.id, type, name: file.name, file, addedAt: Date.now() });
      const tasks = await extractTasksFromPdf(file).catch(() => []);
      return { document: { id, name: file.name }, tasks };
    }));
    try {
      const [actaResults, budgetResults] = await Promise.all([storeFiles(editingProject.newActas || [], 'acta'), storeFiles(editingProject.newBudgets || [], 'presupuesto')]);
      const extractedTasks = [...actaResults, ...budgetResults].flatMap((item) => item.tasks);
      setData((current) => ({ ...current, projects: current.projects.map((project) => project.id === editingProject.id ? { ...project, name: editingProject.name.trim(), actas: [...project.actas, ...actaResults.map((item) => item.document)], budgets: [...project.budgets, ...budgetResults.map((item) => item.document)], workTasks: [...(project.workTasks || []), ...extractedTasks] } : project) }));
      setEditingProject(null); setModal(null); setMessage('');
    } catch { setMessage('No se pudieron guardar los PDF. Comprueba el espacio disponible.'); }
  };
  const removeProject = async (project) => {
    if (data.projects.length === 1 || !window.confirm(`¿Eliminar ${project.name} y sus documentos? Las horas se conservarán.`)) return;
    await Promise.all([...project.actas, ...project.budgets].map((document) => deletePdf(document.id)));
    const remaining = data.projects.filter((item) => item.id !== project.id);
    setData((current) => ({ ...current, projects: remaining }));
    if (selectedProjectId === project.id) setSelectedProjectId(remaining[0].id);
  };

  const projectOptions = data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>);
  const beginEditEntry = (entry) => {
    setManual({ date: entry.date, startTime: entry.startTime, endTime: entry.endTime, task: entry.task, subtasks: entry.subtasks || [], projectId: entry.projectId || entry.clientId });
    setEditingEntryId(entry.id); setMessage(''); setModal('manual');
  };
  const closeModal = () => { setModal(null); setEditingEntryId(null); setEditingProject(null); setMessage(''); };
  const updateWorkTasks = (projectId, updater) => setData((current) => ({ ...current, projects: current.projects.map((project) => project.id === projectId ? { ...project, workTasks: updater(project.workTasks || []) } : project) }));
  const addWorkTask = (event) => {
    event.preventDefault();
    if (!newWorkTask.trim() || !taskProjectId) return;
    updateWorkTasks(taskProjectId, (tasks) => [...tasks, { id: crypto.randomUUID(), title: newWorkTask.trim(), status: 'todo', done: false, createdAt: Date.now(), source: 'Añadida manualmente', subtasks: newWorkSubtasks.map((item) => item.trim()).filter(Boolean) }]);
    setNewWorkTask(''); setNewWorkSubtasks([]);
  };
  const setWorkTaskStatus = (taskId, status) => setData((current) => {
    const project = current.projects.find((item) => item.id === taskProjectId);
    const workTask = (project?.workTasks || []).find((item) => item.id === taskId);
    if (!workTask) return current;
    const done = status === 'done';
    return {
      ...current,
      projects: current.projects.map((item) => item.id === taskProjectId ? { ...item, workTasks: (item.workTasks || []).map((taskItem) => taskItem.id === taskId ? { ...taskItem, status, done } : taskItem) } : item),
      entries: current.entries.map((entry) => (entry.projectId || entry.clientId) === taskProjectId && (entry.workTaskId === taskId || (!entry.workTaskId && entry.task.trim().toLowerCase() === workTask.title.trim().toLowerCase())) ? { ...entry, workTaskId: taskId, taskStatus: status } : entry),
    };
  });
  const removeWorkTask = (taskId) => updateWorkTasks(taskProjectId, (tasks) => tasks.filter((item) => item.id !== taskId));
  const setEntryTaskStatus = (entry, status) => setData((current) => {
    const projectId = entry.projectId || entry.clientId;
    const project = current.projects.find((item) => item.id === projectId);
    const matchingTask = (project?.workTasks || []).find((item) => item.id === entry.workTaskId || item.title.trim().toLowerCase() === entry.task.trim().toLowerCase());
    const workTaskId = matchingTask?.id || crypto.randomUUID();
    const nextTask = matchingTask ? { ...matchingTask, status, done: status === 'done' } : { id: workTaskId, title: entry.task, status, done: status === 'done', createdAt: Date.now(), source: 'Historial de horas', subtasks: entry.subtasks || [] };
    return {
      ...current,
      entries: current.entries.map((item) => item.id === entry.id ? { ...item, workTaskId, taskStatus: status } : item),
      projects: current.projects.map((item) => item.id === projectId ? { ...item, workTasks: matchingTask ? (item.workTasks || []).map((taskItem) => taskItem.id === workTaskId ? nextTask : taskItem) : [...(item.workTasks || []), nextTask] } : item),
    };
  });
  return <div className="simple-app">
    <header className="simple-header"><img src={theme === 'dark' ? logoWhite : logoDark} alt="Maimonet" /><button className="icon-button" onClick={toggleTheme} aria-label="Cambiar tema">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button></header>
    <main className="simple-main">
      <section className="intro"><div><p className="eyebrow">Registro de horas</p><h1>Hola, Julia</h1><p>Guarda el tiempo dedicado a cada proyecto.</p></div><div className="total-card"><Clock3 size={20} /><span>Total · {projectName(selectedProjectId)}</span><strong>{formatDuration(selectedTotal)}</strong></div></section>
      <section className={`timer-card ${data.activeTimer ? 'is-running' : ''}`}>
        {data.activeTimer ? <><span className="live-label"><i /> Trabajando ahora</span><strong className="live-time">{formatLive(now - data.activeTimer.startedAt)}</strong><h2>{data.activeTimer.task}</h2><SubtaskList subtasks={data.activeTimer.subtasks} /><p>{projectName(data.activeTimer.projectId || data.activeTimer.clientId)} · Inicio a las {formatClock(data.activeTimer.startedAt)}</p><button className="finish-button" onClick={finish}>FIN</button></> : <><div className="field-row"><label><span>Proyecto / cliente</span><select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>{projectOptions}</select></label><label><span>¿Qué vas a hacer?</span><input value={task} onChange={(event) => setTask(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && start()} placeholder="Ej. Generador funcional" /></label></div><SubtaskFields subtasks={taskSubtasks} onChange={setTaskSubtasks} />{message && !modal && <p className="form-message">{message}</p>}<button className="start-button" onClick={start}>INICIO</button><p className="start-help">Se guardará la hora actual automáticamente · {formatDuration(selectedTotal)} en este proyecto</p></>}
      </section>
      <section className="projects-section"><div className="section-heading"><div><p className="eyebrow">Clientes, horas y documentación</p><h2>Mis proyectos</h2></div><div className="section-actions"><button className="manual-button" onClick={() => { setManual((value) => ({ ...value, projectId: selectedProjectId })); setModal('manual'); setMessage(''); }}><Clock3 size={17} /> Registro manual</button><button className="manual-button" onClick={() => { setModal('project'); setMessage(''); }}><Plus size={17} /> Nuevo proyecto</button></div></div><div className="project-grid">{data.projects.map((project) => {
        const projectEntries = data.entries.filter((entry) => (entry.projectId || entry.clientId) === project.id);
        const historyFilter = historyFilters[project.id] || 'all';
        const historySort = historySorts[project.id] || 'newest';
        const visibleEntries = projectEntries.filter((entry) => historyFilter === 'all' || (entry.taskStatus || 'todo') === historyFilter).sort((a, b) => historySort === 'oldest' ? a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) : historySort === 'az' ? a.task.localeCompare(b.task, 'es') : historySort === 'za' ? b.task.localeCompare(a.task, 'es') : historySort === 'longest' ? b.durationMs - a.durationMs : historySort === 'shortest' ? a.durationMs - b.durationMs : b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
        const projectTotal = projectEntries.reduce((sum, entry) => sum + entry.durationMs, 0);
        return <article className="project-card" key={project.id}><div className="project-card-title"><span><BriefcaseBusiness size={19} /></span><div><h3>{project.name}</h3><p>{formatDuration(projectTotal)} registradas</p></div><div className="record-actions"><button className="edit-button" onClick={() => { setEditingProject({ ...project, newActas: [], newBudgets: [] }); setModal('edit-project'); setMessage(''); }} aria-label="Editar proyecto"><Pencil size={16} /></button><button className="delete-button" onClick={() => removeProject(project)} aria-label="Eliminar proyecto"><Trash2 size={16} /></button></div></div><button className="task-map-button" onClick={() => { setTaskProjectId(project.id); setModal('task-map'); }}><ListChecks size={18} /><span>Mapa de trabajo</span><strong>{(project.workTasks || []).filter((item) => (item.status || (item.done ? 'done' : 'todo')) !== 'done').length} activas</strong><ChevronRight size={17} /></button><div className="document-groups"><DocumentList label="Actas" documents={project.actas} onOpen={openDocument} /><DocumentList label="Presupuestos" documents={project.budgets} onOpen={openDocument} /></div><details className="project-history"><summary><span>Historial de horas</span><strong>{projectEntries.length} {projectEntries.length === 1 ? 'registro' : 'registros'}</strong></summary><div className="history-controls"><label><span>Filtrar</span><select value={historyFilter} onChange={(event) => setHistoryFilters((current) => ({ ...current, [project.id]: event.target.value }))}><option value="all">Todos los estados</option><option value="todo">Por hacer</option><option value="doing">En curso</option><option value="done">Hecho</option><option value="postponed">Pospuestas</option></select></label><label><span>Ordenar</span><select value={historySort} onChange={(event) => setHistorySorts((current) => ({ ...current, [project.id]: event.target.value }))}><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option><option value="longest">Más horas</option><option value="shortest">Menos horas</option><option value="az">Tarea A–Z</option><option value="za">Tarea Z–A</option></select></label></div><div className="project-history-content">{visibleEntries.length ? visibleEntries.map((entry) => { const status = entry.taskStatus || 'todo'; return <article className={`project-record ${status === 'done' ? 'task-done' : ''}`} key={entry.id}><div className="record-date"><strong>{formatDate(entry.date)}</strong><span>{entry.startTime} — {entry.endTime}</span></div><div className="record-task"><strong>{entry.task}</strong><SubtaskList subtasks={entry.subtasks} /><select className={`entry-status-select status-${status}`} value={status} onChange={(event) => setEntryTaskStatus(entry, event.target.value)} aria-label="Estado de la tarea"><option value="todo">Por hacer</option><option value="doing">En curso</option><option value="done">Hecho</option><option value="postponed">Pospuesta</option></select></div><strong className="record-duration">{formatDuration(entry.durationMs)}</strong><div className="record-actions"><button className="edit-button" onClick={() => beginEditEntry(entry)} aria-label="Editar registro"><Pencil size={16} /></button><button className="delete-button" onClick={() => window.confirm('¿Eliminar este registro?') && setData((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }))} aria-label="Eliminar registro"><Trash2 size={16} /></button></div></article>; }) : <div className="project-history-empty"><Clock3 size={18} /><span>{projectEntries.length ? 'No hay registros con este filtro.' : 'Aún no hay horas en este proyecto.'}</span></div>}</div></details></article>;
      })}</div></section>
    </main>
    {modal === 'manual' && <Modal onClose={closeModal}><form className="modal-form" onSubmit={saveManual}><div className="modal-content"><ModalTitle eyebrow={editingEntryId ? 'Editar horas' : 'Añadir horas'} title={editingEntryId ? 'Editar registro' : 'Registro manual'} onClose={closeModal} /><label><span>Proyecto / cliente</span><select value={manual.projectId} onChange={(e) => setManual({ ...manual, projectId: e.target.value })}>{projectOptions}</select></label><label><span>Tarea realizada</span><input autoFocus value={manual.task} onChange={(e) => setManual({ ...manual, task: e.target.value })} placeholder="Describe brevemente el trabajo" /></label><SubtaskFields subtasks={manual.subtasks || []} onChange={(subtasks) => setManual({ ...manual, subtasks })} /><div className="manual-grid"><label><span>Fecha</span><input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></label><label><span>Inicio</span><input type="time" value={manual.startTime} onChange={(e) => setManual({ ...manual, startTime: e.target.value })} /></label><label><span>Fin</span><input type="time" value={manual.endTime} onChange={(e) => setManual({ ...manual, endTime: e.target.value })} /></label></div>{message && <p className="form-message">{message}</p>}</div><ModalActions onCancel={closeModal} saveLabel={editingEntryId ? 'Guardar cambios' : 'Guardar registro'} /></form></Modal>}
    {modal === 'project' && <Modal onClose={closeModal}><form className="modal-form" onSubmit={saveProject}><div className="modal-content"><ModalTitle eyebrow="Clientes y proyectos" title="Nuevo proyecto" onClose={closeModal} /><label><span>Nombre de la empresa o proyecto</span><input autoFocus value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="Ej. Nuevo cliente" /></label><FileInput label="Actas (varios PDF)" onChange={(files) => setNewProject({ ...newProject, actas: files })} /><FileInput label="Presupuestos (varios PDF)" onChange={(files) => setNewProject({ ...newProject, budgets: files })} />{message && <p className="form-message">{message}</p>}</div><ModalActions onCancel={closeModal} saveLabel="Crear proyecto" /></form></Modal>}
    {modal === 'edit-project' && editingProject && <Modal onClose={closeModal}><form className="modal-form" onSubmit={updateProjectDocuments}><div className="modal-content"><ModalTitle eyebrow="Proyecto y documentos" title={`Editar ${editingProject.name}`} onClose={closeModal} /><label><span>Nombre de la empresa o proyecto</span><input value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} /></label><FileInput label="Añadir nuevas actas (PDF)" onChange={(files) => setEditingProject({ ...editingProject, newActas: files })} /><FileInput label="Añadir nuevos presupuestos (PDF)" onChange={(files) => setEditingProject({ ...editingProject, newBudgets: files })} />{message && <p className="form-message">{message}</p>}</div><ModalActions onCancel={closeModal} saveLabel="Guardar cambios" /></form></Modal>}
    {modal === 'task-map' && taskProjectId && <Modal onClose={closeModal} wide><div className="task-map"><div className="modal-content"><ModalTitle eyebrow="Organización del proyecto" title={`Mapa · ${projectName(taskProjectId)}`} onClose={closeModal} /><p className="task-map-help">Las tareas pueden durar varios días. Cada fichaje suma tiempo sin cambiar automáticamente su estado.</p><form className="new-work-task" onSubmit={addWorkTask}><div className="new-work-task-fields"><input value={newWorkTask} onChange={(event) => setNewWorkTask(event.target.value)} placeholder="Añadir una tarea manualmente" /><SubtaskFields subtasks={newWorkSubtasks} onChange={setNewWorkSubtasks} /></div><button className="save-button"><Plus size={17} /> Añadir tarea</button></form><WorkTaskColumns tasks={data.projects.find((project) => project.id === taskProjectId)?.workTasks || []} entries={data.entries.filter((entry) => (entry.projectId || entry.clientId) === taskProjectId)} onStatusChange={setWorkTaskStatus} onRemove={removeWorkTask} /></div><div className="modal-actions single-action"><button className="save-button" onClick={closeModal}>Guardar y cerrar</button></div></div></Modal>}
  </div>;
}

function Modal({ children, onClose, wide = false }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal-panel ${wide ? 'wide' : ''}`}>{children}</div></div>; }
function ModalTitle({ eyebrow, title, onClose }) { return <div className="modal-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>; }
function ModalActions({ onCancel, saveLabel }) { return <div className="modal-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancelar</button><button type="submit" className="save-button">{saveLabel}</button></div>; }
function SubtaskFields({ subtasks, onChange }) { return <div className="subtask-fields"><div className="subtask-heading"><span>Subtareas <small>(opcional)</small></span><button type="button" onClick={() => onChange([...subtasks, ''])}><Plus size={15} /> Añadir subtarea</button></div>{subtasks.map((subtask, index) => <div className="subtask-input" key={index}><input value={subtask} onChange={(event) => onChange(subtasks.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Ej. Número de preguntas" /><button type="button" onClick={() => onChange(subtasks.filter((_, itemIndex) => itemIndex !== index))} aria-label="Eliminar subtarea"><X size={16} /></button></div>)}</div>; }
function SubtaskList({ subtasks = [] }) { if (!subtasks.length) return null; return <ul className="subtask-list">{subtasks.map((subtask, index) => <li key={`${subtask}-${index}`}>{subtask}</li>)}</ul>; }
function WorkTaskColumns({ tasks, entries, onStatusChange, onRemove }) {
  const states = [{ id: 'todo', label: 'Por hacer' }, { id: 'doing', label: 'En curso' }, { id: 'done', label: 'Hecho' }, { id: 'postponed', label: 'Pospuesta' }];
  const taskStatus = (task) => task.status || (task.done ? 'done' : 'todo');
  const sorted = [...tasks].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const visibleStates = states;
  return <div className={`work-columns columns-${visibleStates.length}`}>{visibleStates.map((state) => {
    const items = sorted.filter((task) => taskStatus(task) === state.id);
    return <section className={`work-column status-${state.id}`} key={state.id}><header><span>{state.id === 'done' ? <Check size={17} /> : <Clock3 size={17} />}{state.label}</span><strong>{items.length}</strong></header><div>{items.length ? items.map((task) => { const taskEntries = entries.filter((entry) => entry.workTaskId === task.id || (!entry.workTaskId && entry.task.trim().toLowerCase() === task.title.trim().toLowerCase())); const taskTime = taskEntries.reduce((total, entry) => total + entry.durationMs, 0); return <article className="work-task" key={task.id}><div><strong>{task.title}</strong><SubtaskList subtasks={task.subtasks} /><span className="task-time"><Clock3 size={12} /> {formatDuration(taskTime)} · {taskEntries.length} {taskEntries.length === 1 ? 'sesión' : 'sesiones'}</span><small>{task.source || 'Añadida manualmente'}</small><select value={taskStatus(task)} onChange={(event) => onStatusChange(task.id, event.target.value)} aria-label={`Estado de ${task.title}`}><option value="todo">Por hacer</option><option value="doing">En curso</option><option value="done">Hecho</option><option value="postponed">Pospuesta</option></select></div><button className="delete-button" onClick={() => onRemove(task.id)} aria-label="Eliminar tarea"><Trash2 size={15} /></button></article>; }) : <p className="empty-column">No hay tareas aquí.</p>}</div></section>;
  })}</div>;
}
function FileInput({ label, onChange }) { const [count, setCount] = useState(0); return <label className="file-input"><span>{label}</span><div><Upload size={18} /><strong>{count ? `${count} PDF seleccionados` : 'Seleccionar archivos'}</strong><small>{count ? 'Se guardarán al pulsar el botón' : 'Solo PDF'}</small></div><input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { const files = [...event.target.files]; setCount(files.length); onChange(files); }} /></label>; }
function DocumentList({ label, documents, onOpen }) { return <div className="document-list"><strong>{label}</strong>{documents.length ? documents.map((document) => <button key={document.id} onClick={() => onOpen(document.id)}><FileText size={15} /><span>{document.name}</span></button>) : <span className="no-documents"><FolderOpen size={14} /> Sin documentos</span>}</div>; }
export default function App() { return <ThemeProvider><HoursApp /></ThemeProvider>; }
