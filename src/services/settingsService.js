import { createId } from './storageService.js';

export const validateSettings = (settings) => {
  const errors = [];

  if (!settings.professionalName?.trim()) {
    errors.push('El nombre profesional es obligatorio.');
  }

  if (Number(settings.hourlyRate) <= 0) {
    errors.push('La tarifa predeterminada debe ser mayor que cero.');
  }

  const total = Number(settings.paymentPercentages?.initial || 0) + Number(settings.paymentPercentages?.intermediate || 0) + Number(settings.paymentPercentages?.final || 0);
  if (Math.abs(total - 100) > 0.0001) {
    errors.push('Los porcentajes de pago deben sumar el 100%.');
  }

  return errors;
};

export const buildSettingsPayload = (settingsData) => ({
  id: settingsData.id || createId(),
  professionalName: settingsData.professionalName?.trim() || '',
  businessName: settingsData.businessName?.trim() || '',
  hourlyRate: Number(settingsData.hourlyRate || 70),
  currency: settingsData.currency || 'EUR',
  dateFormat: settingsData.dateFormat || 'es-ES',
  paymentPercentages: {
    initial: Number(settingsData.paymentPercentages?.initial || 25),
    intermediate: Number(settingsData.paymentPercentages?.intermediate || 50),
    final: Number(settingsData.paymentPercentages?.final || 25),
  },
});
