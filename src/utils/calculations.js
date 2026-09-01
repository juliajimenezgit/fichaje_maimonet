export const formatMinutesToDuration = (minutes) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return '0 h 0 min';
  }

  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  return `${hours} h ${mins} min`;
};

export const calculateWorkedHours = (minutes) => Number((minutes / 60).toFixed(2));

export const calculateWorkedAmount = (hours, rate) => Number((hours * rate).toFixed(2));

export const calculateRemainingHours = (estimatedHours, workedHours) => Number((estimatedHours - workedHours).toFixed(2));

export const calculateBudgetUsagePercentage = (estimatedHours, workedHours) => {
  if (!estimatedHours) {
    return 0;
  }

  return Number(((workedHours / estimatedHours) * 100).toFixed(2));
};

export const calculateRemainingBudget = (agreedBudget, workedAmount) => Number((agreedBudget - workedAmount).toFixed(2));

export const calculatePaymentAmount = (agreedBudget, percentage) => Number((agreedBudget * (percentage / 100)).toFixed(2));

export const formatCurrency = (value, currency = 'EUR') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (value, locale = 'es-ES') => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateInput = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
};

export const calculateElapsedMinutes = (timer) => {
  if (!timer) {
    return 0;
  }

  const now = Date.now();
  if (timer.status === 'running') {
    return Math.max(0, Math.round(((now - timer.startedAt) + timer.elapsedBeforePause) / 60000));
  }

  return Math.max(0, Math.round((timer.elapsedBeforePause || 0) / 60000));
};
