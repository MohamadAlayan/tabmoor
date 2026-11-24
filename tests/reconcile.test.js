import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileWindow,
  findMainWindow,
  waitForQuiet,
  createSerializer,
} from '../extension/lib/reconcile.js';

// A tiny in-memory stand-in for Firefox's tabs/windows APIs.
function fakeBrowser(windowTabs, { windows = [{ id: 1, focused: true, incognito: false }], failUrls = [] } = {}) {
  let nextId = 100;
  let tabs = windowTabs.map((t) => ({ windowId: 1, ...t }));
  const calls = [];
  const listeners = { tab: new Set(), win: new Set() };
  const delay = () => new Promise((r) => setTimeout(r, 1));
  const reindex = () => {
    // Firefox keeps pinned tabs before unpinned ones.
    tabs = [...tabs.filter((t) => t.pinned), ...tabs.filter((t) => !t.pinned)];
    tabs.forEach((t, i) => { t.index = i; });
  };
  reindex();
  const api = {
    calls,
    snapshot: () => tabs.map(({ url, pinned }) => ({ url, pinned })),
    tabs: {
      async query({ windowId }) { await delay(); return tabs.filter((t) => t.windowId === windowId).map((t) => ({ ...t })); },
      async update(id, props) { calls.push(['update', id, props]); tabs.find((t) => t.id === id).pinned = props.pinned; reindex(); },
      async create({ windowId, url, pinned }) {
        await delay();
        calls.push(['create', url]);
        if (failUrls.includes(url)) throw new Error('Illegal URL');
        const tab = { id: nextId++, windowId, url, pinned };
        tabs.push(tab);
        reindex();
        listeners.tab.forEach((fn) => fn(tab));
        return { ...tab };
      },
      async remove(ids) { calls.push(['remove', ids]); tabs = tabs.filter((t) => !ids.includes(t.id)); reindex(); },
      async move(id, { index }) {
        calls.push(['move', id, index]);
        const tab = tabs.find((t) => t.id === id);
        tabs.splice(tabs.indexOf(tab), 1);
        tabs.splice(index, 0, tab);
        reindex();
      },
      onCreated: { addListener: (fn) => listeners.tab.add(fn), removeListener: (fn) => listeners.tab.delete(fn) },
    },
    windows: {
      async getAll() { return windows.map((w) => ({ ...w, type: 'normal' })); },
      onCreated: { addListener: (fn) => listeners.win.add(fn), removeListener: (fn) => listeners.win.delete(fn) },
    },
    listenerCount: () => listeners.tab.size + listeners.win.size,
  };
  return api;
}

const LINKS = ['https://news.com/', 'https://mail.google.com/mail/u/0/', 'https://cal.com/'];

test('reconcileWindow makes pinned tabs exactly the list, in list order', async () => {
  const api = fakeBrowser([
    { id: 1, url: 'https://old.com/', pinned: true },
    { id: 2, url: 'https://mail.google.com/mail/u/0/#inbox/9', pinned: true },
    { id: 3, url: 'https://news.com/today', pinned: false },
    { id: 4, url: 'https://random.com/', pinned: false },
  ]);
  const result = await reconcileWindow(api, 1, LINKS);
  assert.deepEqual(api.snapshot(), [
    { url: 'https://news.com/today', pinned: true },
    { url: 'https://mail.google.com/mail/u/0/#inbox/9', pinned: true },
    { url: 'https://cal.com/', pinned: true },
    { url: 'https://random.com/', pinned: false },
  ]);
  assert.deepEqual(result, { pinned: 1, opened: 1, closed: 1, failed: [] });
});

test('reconcileWindow with an empty list changes nothing', async () => {
  const api = fakeBrowser([{ id: 1, url: 'https://old.com/', pinned: true }]);
  await reconcileWindow(api, 1, []);
  assert.deepEqual(api.calls, []);
});

test('reconcileWindow opens new tabs before closing, so the window never empties', async () => {
  const api = fakeBrowser([{ id: 1, url: 'https://old.com/', pinned: true }]);
  await reconcileWindow(api, 1, ['https://a.com/']);
  const kinds = api.calls.map((c) => c[0]);
  assert.ok(kinds.indexOf('create') < kinds.indexOf('remove'));
  assert.deepEqual(api.snapshot(), [{ url: 'https://a.com/', pinned: true }]);
});

test('reconcileWindow keeps going when one link cannot be opened', async () => {
  const api = fakeBrowser([], { failUrls: ['https://bad.com/'] });
  const result = await reconcileWindow(api, 1, ['https://bad.com/', 'https://good.com/']);
  assert.deepEqual(api.snapshot(), [{ url: 'https://good.com/', pinned: true }]);
  assert.deepEqual(result.failed, ['https://bad.com/']);
});

test('createSerializer: two overlapping runs do not open duplicate tabs', async () => {
  const api = fakeBrowser([]);
  const serialize = createSerializer();
  await Promise.all([
    serialize(() => reconcileWindow(api, 1, ['https://a.com/'])),
    serialize(() => reconcileWindow(api, 1, ['https://a.com/'])),
  ]);
  assert.equal(api.snapshot().length, 1);
});

test('createSerializer: a failed run does not block the next one', async () => {
  const serialize = createSerializer();
  await assert.rejects(serialize(async () => { throw new Error('boom'); }));
  assert.equal(await serialize(async () => 'ok'), 'ok');
});

test('findMainWindow prefers the focused normal window and skips private ones', async () => {
  const api = fakeBrowser([], {
    windows: [
      { id: 1, focused: false, incognito: false },
      { id: 2, focused: true, incognito: true },
      { id: 3, focused: false, incognito: false },
    ],
  });
  assert.equal((await findMainWindow(api)).id, 1);

  const api2 = fakeBrowser([], { windows: [{ id: 1, focused: false, incognito: false }, { id: 3, focused: true, incognito: false }] });
  assert.equal((await findMainWindow(api2)).id, 3);

  const api3 = fakeBrowser([], { windows: [{ id: 2, focused: true, incognito: true }] });
  assert.equal(await findMainWindow(api3), null);
});

test('waitForQuiet waits while tabs keep appearing, then cleans up its listeners', async () => {
  const api = fakeBrowser([]);
  const started = Date.now();
  const waiting = waitForQuiet(api, { minMs: 40, quietMs: 60, maxMs: 1000, tickMs: 5 });
  setTimeout(() => api.tabs.create({ windowId: 1, url: 'https://x.com/', pinned: false }), 30);
  await waiting;
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 85, `resolved too early (${elapsed}ms)`);
  assert.equal(api.listenerCount(), 0);
});

test('waitForQuiet gives up at maxMs even if tabs never stop appearing', async () => {
  const api = fakeBrowser([]);
  const noisy = setInterval(() => api.tabs.create({ windowId: 1, url: 'https://x.com/', pinned: false }), 10);
  const started = Date.now();
  await waitForQuiet(api, { minMs: 10, quietMs: 50, maxMs: 120, tickMs: 5 });
  clearInterval(noisy);
  assert.ok(Date.now() - started < 300);
});
