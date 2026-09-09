import { createClient } from '@supabase/supabase-js';
import { createInitialData } from '../data/initialData.js';

export const STORAGE_KEY = 'maimonet-app-state-v1';
export const STORAGE_TABLE = 'app_state';

export const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

export const hasSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey);
};

const getSupabaseClient = () => {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const readLocalStorageState = () => {
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

const writeLocalStorageState = (state) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const readSharedState = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return readLocalStorageState();
  }

  try {
    const { data, error } = await client
      .from(STORAGE_TABLE)
      .select('state')
      .eq('id', 'app')
      .maybeSingle();

    if (error) {
      console.error('Supabase read error:', error.message);
      return readLocalStorageState();
    }

    return data?.state ?? readLocalStorageState();
  } catch (error) {
    console.error('Supabase unavailable:', error);
    return readLocalStorageState();
  }
};

export const saveSharedState = async (state) => {
  const client = getSupabaseClient();

  if (typeof window !== 'undefined') {
    writeLocalStorageState(state);
  }

  if (!client) {
    return;
  }

  try {
    const { error } = await client.from(STORAGE_TABLE).upsert(
      {
        id: 'app',
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Supabase write error:', error.message);
    }
  } catch (error) {
    console.error('Supabase sync failed:', error);
  }
};

export const readStorageState = () => readLocalStorageState();

export const writeStorageState = (state) => {
  writeLocalStorageState(state);
  void saveSharedState(state);
};

export const initializeStorage = () => {
  const stored = readLocalStorageState();
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
