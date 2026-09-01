import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeStorage, readStorageState, resetStorage, writeStorageState } from '../services/storageService.js';
import { buildProjectPayload, buildProjectPayments, validateProject } from '../services/projectService.js';
import { buildSettingsPayload, validateSettings } from '../services/settingsService.js';
import { buildTimeEntryPayload, validateTimeEntry } from '../services/timeEntryService.js';
import { calculateElapsedMinutes } from '../utils/calculations.js';
import { createInitialData } from '../data/initialData.js';
import { createId } from '../services/storageService.js';

const defaultContextValue = {
  state: {
    settings: {},
    projects: [],
    tasks: [],
    timeEntries: [],
    payments: [],
    activeTimer: null,
  },
  errors: [],
  activeTimer: null,
  updateSettings: () => ({ success: false }),
  addProject: () => ({ success: false }),
  updateProject: () => ({ success: false }),
  deleteProject: () => ({ success: false }),
  addTask: () => ({ success: false }),
  updateTask: () => ({ success: false }),
  deleteTask: () => ({ success: false }),
  addTimeEntry: () => ({ success: false }),
  updateTimeEntry: () => ({ success: false }),
  deleteTimeEntry: () => ({ success: false }),
  updatePaymentStatus: () => ({ success: false }),
  setTimer: () => ({ success: false }),
  clearTimer: () => ({ success: false }),
  startTimer: () => ({ success: false }),
  pauseTimer: () => ({ success: false }),
  resumeTimer: () => ({ success: false }),
  finishTimer: () => ({ success: false }),
  cancelTimer: () => ({ success: false }),
  importBackup: () => ({ success: false }),
  resetAll: () => ({ success: false }),
};

const AppContext = createContext(defaultContextValue);

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(() => initializeStorage());
  const [errors, setErrors] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);

  useEffect(() => {
    const stored = readStorageState();
    if (stored) {
      setState(stored);
      setActiveTimer(stored.activeTimer || null);
    }
    // After loading existing state, merge Dubita tasks from initial data if missing
    try {
      const initial = createInitialData();
      const storedState = stored || {};
      const storedTasks = (storedState.tasks || []).map((t) => t.id);
      const dubitaTasks = (initial.tasks || []).filter((t) => t.projectId === 'proj-dubita');
      const missing = dubitaTasks.filter((t) => !storedTasks.includes(t.id));
      if (missing.length) {
        const next = {
          ...storedState,
          tasks: [...(storedState.tasks || []), ...missing],
        };
        writeStorageState(next);
        // also set local React state so running app sees them immediately
        setState(next);
      }
      // Add example time entries for Dubita tasks if they don't exist
      const storedEntryIds = (storedState.timeEntries || []).map((e) => e.taskId + '::' + e.projectId + '::' + (e.durationMinutes || 0));
      const dubitaDurations = {
        'task-dubita-2': 120, // 2 h
        'task-dubita-3': 30,  // 0.5 h
        'task-dubita-4': 120, // 2 h
        'task-dubita-5': 120, // 2 h
        'task-dubita-6': 120, // 2 h
        'task-dubita-7': 60,  // 1 h
      };

      const entriesToAdd = [];
      const today = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();

      dubitaTasks.forEach((task) => {
        const dur = dubitaDurations[task.id];
        if (!dur) return;
        const key = task.id + '::' + 'proj-dubita' + '::' + dur;
        // simple heuristic to avoid duplicates: check if any entry exists for taskId
        const exists = (storedState.timeEntries || []).some((e) => e.taskId === task.id && e.projectId === 'proj-dubita');
        if (!exists) {
          entriesToAdd.push({
            id: createId(),
            projectId: 'proj-dubita',
            taskId: task.id,
            date: today,
            startTime: '',
            endTime: '',
            durationMinutes: dur,
            description: `Registro inicial: ${task.name}`,
            source: 'import',
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      });

      if (entriesToAdd.length) {
        const nextEntriesState = {
          ...readStorageState(),
          timeEntries: [...(storedState.timeEntries || []), ...entriesToAdd],
        };
        writeStorageState(nextEntriesState);
        setState((s) => ({ ...s, timeEntries: [...(s.timeEntries || []), ...entriesToAdd] }));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    writeStorageState(state);
  }, [state]);

  const saveState = (nextState) => {
    setState(nextState);
    writeStorageState(nextState);
  };

  const updateSettings = (settingsData) => {
    const payload = buildSettingsPayload(settingsData);
    const validationErrors = validateSettings(payload);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return { success: false, errors: validationErrors };
    }

    const nextState = { ...state, settings: payload };
    saveState(nextState);
    setErrors([]);
    return { success: true, settings: payload };
  };

  const addProject = (projectData) => {
    const payload = buildProjectPayload(projectData, state.settings);
    const validationErrors = validateProject(payload, state.settings);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return { success: false, errors: validationErrors };
    }

    const nextState = {
      ...state,
      projects: [payload, ...state.projects],
    };
    const payments = buildProjectPayments(payload.id, payload.agreedBudget, state.settings.paymentPercentages, []);
    nextState.payments = [...state.payments, ...payments];
    saveState(nextState);
    setErrors([]);
    return { success: true, project: payload };
  };

  const updateProject = (projectData) => {
    const payload = buildProjectPayload(projectData, state.settings);
    const validationErrors = validateProject(payload, state.settings);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return { success: false, errors: validationErrors };
    }

    const nextState = {
      ...state,
      projects: state.projects.map((project) => project.id === payload.id ? payload : project),
    };
    saveState(nextState);
    setErrors([]);
    return { success: true, project: payload };
  };

  const deleteProject = (projectId) => {
    const project = state.projects.find((entry) => entry.id === projectId);
    const projectEntries = state.timeEntries.filter((entry) => entry.projectId === projectId);
    const projectTasks = state.tasks.filter((task) => task.projectId === projectId);
    const projectPayments = state.payments.filter((payment) => payment.projectId === projectId);

    if (projectEntries.length || projectTasks.length || projectPayments.length) {
      return { success: false, message: 'El proyecto tiene registros asociados, se eliminarán tareas, horas y pagos.' };
    }

    const nextState = {
      ...state,
      projects: state.projects.filter((entry) => entry.id !== projectId),
    };
    saveState(nextState);
    return { success: true };
  };

  const addTask = (taskData) => {
    const payload = {
      id: taskData.id || `task-${Date.now()}`,
      projectId: taskData.projectId,
      name: taskData.name?.trim(),
      description: taskData.description?.trim() || '',
      status: taskData.status || 'pending',
      estimatedHours: Number(taskData.estimatedHours || 0),
      createdAt: taskData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextState = {
      ...state,
      tasks: [payload, ...state.tasks],
    };
    saveState(nextState);
    return { success: true, task: payload };
  };

  const updateTask = (taskData) => {
    const nextState = {
      ...state,
      tasks: state.tasks.map((task) => task.id === taskData.id ? { ...task, ...taskData, updatedAt: new Date().toISOString() } : task),
    };
    saveState(nextState);
    return { success: true };
  };

  const deleteTask = (taskId) => {
    const nextState = {
      ...state,
      tasks: state.tasks.filter((task) => task.id !== taskId),
    };
    saveState(nextState);
    return { success: true };
  };

  const addTimeEntry = (entryData) => {
    const payload = buildTimeEntryPayload(entryData);
    const validationErrors = validateTimeEntry(payload, state.projects);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return { success: false, errors: validationErrors };
    }

    const nextState = {
      ...state,
      timeEntries: [payload, ...state.timeEntries],
    };
    saveState(nextState);
    setErrors([]);
    return { success: true, entry: payload };
  };

  const updateTimeEntry = (entryData) => {
    const payload = buildTimeEntryPayload(entryData);
    const validationErrors = validateTimeEntry(payload, state.projects);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return { success: false, errors: validationErrors };
    }

    const nextState = {
      ...state,
      timeEntries: state.timeEntries.map((entry) => entry.id === payload.id ? payload : entry),
    };
    saveState(nextState);
    setErrors([]);
    return { success: true, entry: payload };
  };

  const deleteTimeEntry = (entryId) => {
    const nextState = {
      ...state,
      timeEntries: state.timeEntries.filter((entry) => entry.id !== entryId),
    };
    saveState(nextState);
    return { success: true };
  };

  const updatePaymentStatus = (paymentId, status, paidDate = '', notes = '') => {
    const nextState = {
      ...state,
      payments: state.payments.map((payment) => payment.id === paymentId ? { ...payment, status, paidDate, notes } : payment),
    };
    saveState(nextState);
    return { success: true };
  };

  const setTimer = (timerData) => {
    const nextState = {
      ...state,
      activeTimer: timerData,
    };
    saveState(nextState);
    setActiveTimer(timerData);
    return { success: true };
  };

  const clearTimer = () => {
    const nextState = {
      ...state,
      activeTimer: null,
    };
    saveState(nextState);
    setActiveTimer(null);
    return { success: true };
  };

  const startTimer = ({ projectId, taskId, description }) => {
    if (state.activeTimer) {
      return { success: false, message: 'Ya hay un fichaje activo.' };
    }

    const timer = {
      projectId,
      taskId,
      description: description?.trim() || '',
      status: 'running',
      startedAt: Date.now(),
      elapsedBeforePause: 0,
    };

    setTimer(timer);
    return { success: true, timer };
  };

  const pauseTimer = () => {
    if (!state.activeTimer || state.activeTimer.status !== 'running') {
      return { success: false };
    }

    const totalElapsed = calculateElapsedMinutes(state.activeTimer);
    const timer = {
      ...state.activeTimer,
      status: 'paused',
      elapsedBeforePause: totalElapsed * 60000,
      pausedAt: Date.now(),
    };

    setTimer(timer);
    return { success: true, timer };
  };

  const resumeTimer = () => {
    if (!state.activeTimer || state.activeTimer.status !== 'paused') {
      return { success: false };
    }

    const timer = {
      ...state.activeTimer,
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
    };
    setTimer(timer);
    return { success: true, timer };
  };

  const finishTimer = ({ description }) => {
    if (!state.activeTimer) {
      return { success: false };
    }

    const elapsedMinutes = calculateElapsedMinutes(state.activeTimer);
    const payload = buildTimeEntryPayload({
      projectId: state.activeTimer.projectId,
      taskId: state.activeTimer.taskId,
      description: description?.trim() || state.activeTimer.description || 'Fichaje finalizado',
      date: new Date().toISOString().slice(0, 10),
      startTime: '',
      endTime: '',
      durationMinutes: elapsedMinutes,
      source: 'timer',
    });

    const nextState = {
      ...state,
      timeEntries: [payload, ...state.timeEntries],
      activeTimer: null,
    };
    saveState(nextState);
    setActiveTimer(null);
    return { success: true, entry: payload };
  };

  const cancelTimer = () => {
    if (!state.activeTimer) {
      return { success: false };
    }

    clearTimer();
    return { success: true };
  };

  const importBackup = (jsonData) => {
    try {
      const parsed = JSON.parse(jsonData);
      const nextState = { ...state, ...parsed };
      saveState(nextState);
      return { success: true, state: nextState };
    } catch (error) {
      return { success: false, message: 'El archivo JSON no es válido.' };
    }
  };

  const resetAll = () => {
    const nextState = resetStorage();
    saveState(nextState);
    setErrors([]);
    return { success: true, state: nextState };
  };

  const value = useMemo(() => ({
    state,
    errors,
    activeTimer,
    updateSettings,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    updatePaymentStatus,
    setTimer,
    clearTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    finishTimer,
    cancelTimer,
    importBackup,
    resetAll,
  }), [state, errors, activeTimer]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext) || defaultContextValue;
