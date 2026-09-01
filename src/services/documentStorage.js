const DB_NAME = 'maimonet-documents';
const STORE_NAME = 'pdfs';

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const withStore = async (mode, action) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
};

export const savePdf = (document) => withStore('readwrite', (store) => store.put(document));
export const getPdf = (id) => withStore('readonly', (store) => store.get(id));
export const deletePdf = (id) => withStore('readwrite', (store) => store.delete(id));
