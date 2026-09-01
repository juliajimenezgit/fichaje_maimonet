import { createId } from './storageService.js';

export const validateProject = (project, settings) => {
  const errors = [];

  if (!project.name?.trim()) {
    errors.push('El nombre del proyecto es obligatorio.');
  }

  if (!project.clientName?.trim()) {
    errors.push('El nombre del cliente es obligatorio.');
  }

  if (Number(project.hourlyRate) <= 0) {
    errors.push('La tarifa por hora debe ser mayor que cero.');
  }

  if (Number(project.estimatedHours) < 0) {
    errors.push('Las horas presupuestadas no pueden ser negativas.');
  }

  if (Number(project.agreedBudget) < 0) {
    errors.push('El presupuesto acordado no puede ser negativo.');
  }

  if (project.startDate && project.estimatedEndDate && project.startDate > project.estimatedEndDate) {
    errors.push('La fecha de finalización no puede ser anterior a la inicial.');
  }

  if (project.hourlyRate === '' || project.hourlyRate === null) {
    project.hourlyRate = settings.hourlyRate;
  }

  return errors;
};

export const buildProjectPayload = (projectData, settings) => ({
  id: projectData.id || createId(),
  name: projectData.name?.trim(),
  clientName: projectData.clientName?.trim(),
  description: projectData.description?.trim() || '',
  status: projectData.status || 'pending',
  startDate: projectData.startDate || '',
  estimatedEndDate: projectData.estimatedEndDate || '',
  hourlyRate: Number(projectData.hourlyRate || settings.hourlyRate),
  estimatedHours: Number(projectData.estimatedHours || 0),
  agreedBudget: Number(projectData.agreedBudget || 0),
  budgetNotes: projectData.budgetNotes?.trim() || '',
  createdAt: projectData.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const buildProjectPayments = (projectId, agreedBudget, paymentPercentages = {}, existingPayments = []) => {
  const payments = existingPayments.filter((payment) => payment.projectId !== projectId);
  const basePercentages = {
    initial: 25,
    intermediate: 50,
    final: 25,
    ...paymentPercentages,
  };

  const schedule = [
    { type: 'initial', label: 'Pago inicial', percentage: basePercentages.initial },
    { type: 'intermediate', label: 'Pago intermedio', percentage: basePercentages.intermediate },
    { type: 'final', label: 'Pago final', percentage: basePercentages.final },
  ];

  return schedule.map((payment, index) => ({
    id: `${projectId}-${payment.type}`,
    projectId,
    type: payment.type,
    label: payment.label,
    percentage: Number(payment.percentage),
    amount: Number((agreedBudget * (Number(payment.percentage) / 100)).toFixed(2)),
    status: index === 0 ? 'paid' : 'pending',
    paidDate: index === 0 ? new Date().toISOString().slice(0, 10) : '',
    notes: index === 0 ? 'Cobrado al inicio.' : '',
  }));
};
