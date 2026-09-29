import { createClient } from '@supabase/supabase-js';

export const STORAGE_TABLE = 'app_state';
const LEGACY_STORAGE_KEYS = ['maimonet-app-state-v1', 'maimonet-simple-hours-v1', 'maimonet-simple-hours-v2'];
let supabaseClient;

export const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const getPublicKey = () => import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const hasSupabaseConfig = () => Boolean(import.meta.env?.VITE_SUPABASE_URL && getPublicKey());

const getSupabaseClient = () => {
  if (!hasSupabaseConfig()) {
    throw new Error('Falta configurar la conexión con Supabase.');
  }
  supabaseClient ??= createClient(import.meta.env.VITE_SUPABASE_URL, getPublicKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
};

export const removeLegacyLocalState = () => {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
};

export const readSharedState = async (client = getSupabaseClient()) => {
  const { data, error } = await client.from(STORAGE_TABLE).select('state, updated_at').eq('id', 'app').maybeSingle();
  if (error) throw new Error('No se han podido cargar los datos de Supabase. Comprueba la conexión y vuelve a intentarlo.', { cause: error });
  if (!data) return { projects: [], entries: [], activeTimer: null };
  if (!Array.isArray(data.state?.projects) || !Array.isArray(data.state?.entries)) {
    throw new Error('Los datos de Supabase no tienen el formato esperado.');
  }
  return { ...data.state, activeTimer: data.state.activeTimer || null };
};

export const saveSharedState = async (state, client = getSupabaseClient()) => {
  const updatedAt = Date.now();
  const { error } = await client.from(STORAGE_TABLE).upsert({
    id: 'app',
    state: { ...state, _meta: { ...state._meta, updatedAt } },
    updated_at: new Date(updatedAt).toISOString(),
  }, { onConflict: 'id' });
  if (error) throw new Error('No se han guardado los cambios en Supabase. Mantén esta página abierta y reintenta el guardado.', { cause: error });
};
