import { createClient } from '@supabase/supabase-js';
import { createInitialData } from '../data/initialData.js';

export const STORAGE_KEY = 'maimonet-app-state-v1';
export const STORAGE_TABLE = 'app_state';

const stampState = (state) => {
  if (!state || typeof state !== 'object') {
    return { _meta: { updatedAt: Date.now() }, projects: [], entries: [], activeTimer: null };
  }

  return {
    ...state,
    _meta: {
      ...state._meta,
      updatedAt: state._meta?.updatedAt || Date.now(),
    },
  };
};

const getStateTimestamp = (state) => Number(state?._meta?.updatedAt || state?.updatedAt || 0);

const chooseLatestState = (localState, remoteState) => {
  if (!localState && !remoteState) {
    return null;
  }

  if (!localState) {
    return remoteState;
  }

  if (!remoteState) {
    return localState;
  }

  return getStateTimestamp(localState) >= getStateTimestamp(remoteState) ? localState : remoteState;
};

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
  const localState = readLocalStorageState();

  if (!client) {
    return localState;
  }

  try {
    const { data, error } = await client
      .from(STORAGE_TABLE)
      .select('state, updated_at')
      .eq('id', 'app')
      .maybeSingle();

    if (error) {
      console.error('Supabase read error:', error.message);
      return localState;
    }

    if (!data?.state) {
      return localState;
    }

    const remoteState = { ...data.state, _meta: { ...data.state._meta, updatedAt: new Date(data.updated_at || Date.now()).getTime() } };
    return chooseLatestState(localState, remoteState);
  } catch (error) {
    console.error('Supabase unavailable:', error);
    return localState;
  }
};

export const saveSharedState = async (state) => {
  const client = getSupabaseClient();
  const preparedState = stampState(state);

  if (typeof window !== 'undefined') {
    writeLocalStorageState(preparedState);
  }

  if (!client) {
    return;
  }

  try {
    const { error } = await client.from(STORAGE_TABLE).upsert(
      {
        id: 'app',
        state: preparedState,
        updated_at: new Date(preparedState._meta.updatedAt).toISOString(),
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
  const preparedState = stampState(state);
  writeLocalStorageState(preparedState);
  void saveSharedState(preparedState);
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
