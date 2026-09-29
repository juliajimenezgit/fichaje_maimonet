import assert from 'node:assert/strict';
import test from 'node:test';
import { readSharedState, saveSharedState, removeLegacyLocalState } from '../src/services/storageService.js';
import { createSharedStateStore } from '../src/services/sharedStateStore.js';

const remote = { projects: [{ id: 'qth-sutan' }], entries: [{ id: 'entry', durationMs: 61380000 }], activeTimer: null };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const readClient = (result) => ({
  from(table) {
    assert.equal(table, 'app_state');
    return { select: () => ({ eq: (key, value) => {
      assert.equal(key, 'id'); assert.equal(value, 'app');
      return { maybeSingle: async () => result };
    } }) };
  },
});

test('reads the remote 17 h 03 min without consulting browser storage', async () => {
  const data = await readSharedState(readClient({ data: { state: remote }, error: null }));
  assert.deepEqual(data, remote);
  assert.equal(data.entries[0].durationMs / 60000, 1023);
});

test('an absent row gives an empty app, never seed data', async () => {
  assert.deepEqual(await readSharedState(readClient({ data: null })), { projects: [], entries: [], activeTimer: null });
});

test('read errors, missing configuration and malformed rows fail explicitly', async () => {
  await assert.rejects(readSharedState(readClient({ error: { message: 'denied' } })), /cargar/);
  await assert.rejects(readSharedState(readClient({ data: { state: { projects: [] } } })), /formato/);
  await assert.rejects(readSharedState(), /configurar/);
});

test('removes all legacy fichaje keys while preserving unrelated preferences', () => {
  const keys = new Map(['maimonet-app-state-v1', 'maimonet-simple-hours-v1', 'maimonet-simple-hours-v2', 'maimonet-theme'].map(key => [key, 'old']));
  globalThis.window = { localStorage: { removeItem: key => keys.delete(key) } };
  try {
    removeLegacyLocalState();
    assert.deepEqual([...keys.keys()], ['maimonet-theme']);
  } finally { delete globalThis.window; }
});

test('writes only to Supabase with a fresh timestamp and propagates write errors', async () => {
  const before = Date.now();
  await saveSharedState({ ...remote, _meta: { updatedAt: 1 } }, {
    from: () => ({ upsert: async (row, options) => {
      assert.equal(row.id, 'app');
      assert.deepEqual(row.state.entries, remote.entries);
      assert.ok(row.state._meta.updatedAt >= before);
      assert.equal(Date.parse(row.updated_at), row.state._meta.updatedAt);
      assert.deepEqual(options, { onConflict: 'id' });
      return { error: null };
    } }),
  });
  await assert.rejects(saveSharedState(remote, { from: () => ({ upsert: async () => ({ error: { message: 'offline' } }) }) }), /No se han guardado/);
});

test('does not write before or after hydration, including duplicate StrictMode loads', async () => {
  const request = deferred();
  let reads = 0;
  const writes = [];
  const store = createSharedStateStore({ read: () => { reads++; return request.promise; }, save: async value => writes.push(value) });
  const first = store.load();
  const second = store.load();
  store.update(remote);
  assert.equal(store.getSnapshot().data, null);
  request.resolve(remote);
  await Promise.all([first, second]);
  await store.load();
  assert.equal(reads, 1);
  assert.equal(store.getSnapshot().data, remote);
  assert.equal(store.getSnapshot().status, 'saved');
  assert.deepEqual(writes, []);
});

test('failed loading keeps editing blocked and supports retry without writing', async () => {
  let attempts = 0;
  const store = createSharedStateStore({ read: async () => { if (!attempts++) throw new Error('offline'); return remote; }, save: () => assert.fail('unexpected write') });
  await store.load();
  assert.equal(store.getSnapshot().status, 'load-error');
  store.update(remote);
  await store.retrySave();
  assert.equal(store.getSnapshot().data, null);
  await store.load();
  assert.equal(store.getSnapshot().data, remote);
});

test('serializes rapid edits so an older request cannot overwrite the latest data', async () => {
  const firstWrite = deferred();
  const writes = [];
  const store = createSharedStateStore({ read: async () => remote, save: async value => {
    writes.push(value);
    if (writes.length === 1) await firstWrite.promise;
  } });
  await store.load();
  store.update(current => ({ ...current, entries: [...current.entries, { id: 'second' }] }));
  const finalSave = store.update(current => ({ ...current, entries: [...current.entries, { id: 'third' }] }));
  await Promise.resolve();
  assert.equal(writes.length, 1);
  assert.equal(store.getSnapshot().status, 'saving');
  firstWrite.resolve();
  await finalSave;
  assert.equal(writes.length, 2);
  assert.equal(writes[1].entries.length, 3);
  assert.equal(store.getSnapshot().data.entries.length, 3);
  assert.equal(store.getSnapshot().status, 'saved');
});

test('failed writes stay visible and retry uses the latest in-memory changes', async () => {
  let attempts = 0;
  const store = createSharedStateStore({ read: async () => remote, save: async () => { if (!attempts++) throw new Error('offline'); } });
  await store.load();
  await store.update(current => ({ ...current, activeTimer: { startedAt: 123 } }));
  assert.equal(store.getSnapshot().status, 'save-error');
  assert.equal(store.getSnapshot().data.activeTimer.startedAt, 123);
  await store.retrySave();
  assert.equal(store.getSnapshot().status, 'saved');
});
