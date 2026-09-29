import { readSharedState, saveSharedState } from './storageService.js';

// The only working copy is in memory. Loading never writes to Supabase.
export const createSharedStateStore = ({ read = readSharedState, save = saveSharedState } = {}) => {
  let snapshot = { data: null, status: 'loading', error: '' };
  let loading;
  let writeQueue = Promise.resolve();
  let revision = 0;
  const listeners = new Set();
  const publish = (next) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const persist = () => {
    const data = snapshot.data;
    const requestedRevision = ++revision;
    publish({ data, status: 'saving', error: '' });
    // Serialize requests so a slow earlier save cannot overwrite a later edit.
    writeQueue = writeQueue.then(() => save(data)).then(() => {
      if (requestedRevision === revision) publish({ data, status: 'saved', error: '' });
    }).catch((error) => {
      if (requestedRevision === revision) publish({ data, status: 'save-error', error: error.message || 'No se han guardado los cambios. Reintenta el guardado.' });
    });
    return writeQueue;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load: () => {
      if (loading) return loading;
      if (snapshot.data) return Promise.resolve();
      publish({ data: null, status: 'loading', error: '' });
      loading = Promise.resolve().then(read).then((data) => {
        publish({ data, status: 'saved', error: '' });
      }).catch((error) => {
        publish({ data: null, status: 'load-error', error: error.message || 'No se han podido cargar los datos. Comprueba la conexión.' });
      }).finally(() => { loading = null; });
      return loading;
    },
    update: (updater) => {
      if (!snapshot.data) return;
      const data = typeof updater === 'function' ? updater(snapshot.data) : updater;
      if (data === snapshot.data) return;
      snapshot = { ...snapshot, data };
      return persist();
    },
    retrySave: () => snapshot.data ? persist() : Promise.resolve(),
  };
};
