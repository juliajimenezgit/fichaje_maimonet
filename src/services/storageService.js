import { createInitialData } from '../data/initialData.js';

export const STORAGE_KEY = 'maimonet-app-state-v1';

export const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

export const readStorageState = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const writeStorageState = (state) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const initializeStorage = () => {
  const stored = readStorageState();
  if (stored) {
    return stored;
  }

  const initialState = createInitialData();
  writeStorageState(initialState);
  return initialState;
};

export const resetStorage = () => {
  const initialState = createInitialData();
  writeStorageState(initialState);
  return initialState;
};
