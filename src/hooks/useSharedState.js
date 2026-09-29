import { useEffect, useState, useSyncExternalStore } from 'react';
import { createSharedStateStore } from '../services/sharedStateStore.js';

export const useSharedState = () => {
  const [store] = useState(createSharedStateStore);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { void store.load(); }, [store]);
  return { ...snapshot, setData: store.update, retryLoad: store.load, retrySave: store.retrySave };
};
