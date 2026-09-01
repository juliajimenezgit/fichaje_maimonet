import { createId } from './storageService.js';

export const parseTimeToMinutes = (value) => {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

export const validateTimeEntry = (entry, projects = []) => {
  const errors = [];
  if (!entry.projectId) {
    errors.push('Debes asignar un proyecto.');
  }

  if (!entry.description?.trim()) {
    errors.push('Añade una descripción del trabajo realizado.');
  }

  if (entry.startTime && entry.endTime) {
    const startMinutes = parseTimeToMinutes(entry.startTime);
    const endMinutes = parseTimeToMinutes(entry.endTime);
    if (startMinutes === null || endMinutes === null) {
      errors.push('Las horas de inicio y fin deben tener formato válido.');
    } else if (endMinutes <= startMinutes) {
      errors.push('La hora final debe ser posterior a la inicial.');
    }
  }

  if (Number(entry.durationMinutes) < 0) {
    errors.push('La duración no puede ser negativa.');
  }

  if (!projects.some((project) => project.id === entry.projectId)) {
    errors.push('El proyecto seleccionado no existe.');
  }

  return errors;
};

export const buildTimeEntryPayload = (entryData) => ({
  id: entryData.id || createId(),
  projectId: entryData.projectId,
  taskId: entryData.taskId || '',
  date: entryData.date || new Date().toISOString().slice(0, 10),
  startTime: entryData.startTime || '',
  endTime: entryData.endTime || '',
  durationMinutes: Number(entryData.durationMinutes || 0),
  description: entryData.description?.trim() || '',
  source: entryData.source || 'manual',
  createdAt: entryData.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
