// Applies the plan from match.js to real tabs.
// Every function takes the WebExtension API object (`browser`) as `api`,
// so tests can hand in a fake one.

import { planReconcile } from './match.js';

/**
 * Make the pinned tabs in one window match `links`:
 * pin reused tabs, open missing links, close unlisted pinned tabs, then sort.
 * An empty list does nothing.
 */
export async function reconcileWindow(api, windowId, links) {
  const tabs = await api.tabs.query({ windowId });
  const plan = planReconcile(tabs, links);
  const order = [...plan.order];
  const failed = [];
  let opened = 0;

  for (const id of plan.toPin) {
    await api.tabs.update(id, { pinned: true });
  }

  // Open before closing, so the window is never left without tabs.
  for (const i of plan.toOpen) {
    try {
      const tab = await api.tabs.create({ windowId, url: links[i], pinned: true, active: false });
      order[i] = tab.id;
      opened += 1;
    } catch (error) {
      console.warn(`Tabmoor: could not open ${links[i]}`, error);
      failed.push(links[i]);
    }
  }

  if (plan.toClose.length) {
    await api.tabs.remove(plan.toClose);
  }

  let index = 0;
  for (const id of order) {
    if (id === null) continue;
    await api.tabs.move(id, { index });
    index += 1;
  }

  return { pinned: plan.toPin.length, opened, closed: plan.toClose.length, failed };
}

/** The window Tabmoor manages: the focused normal window, never a private one. */
export async function findMainWindow(api) {
  const windows = await api.windows.getAll({ windowTypes: ['normal'] });
  const usable = windows.filter((w) => !w.incognito && (w.type ?? 'normal') === 'normal');
  return usable.find((w) => w.focused) ?? usable[0] ?? null;
}

/**
 * Resolve once Firefox has finished restoring the last session:
 * at least `minMs` after the call, and no new tab or window for `quietMs`.
 * Gives up waiting after `maxMs`.
 */
export function waitForQuiet(api, { minMs = 3000, quietMs = 1500, maxMs = 15000, tickMs = 250 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    let lastActivity = start;
    const bump = () => {
      lastActivity = Date.now();
    };
    api.tabs.onCreated.addListener(bump);
    api.windows.onCreated.addListener(bump);

    const timer = setInterval(() => {
      const now = Date.now();
      const settled = now - start >= minMs && now - lastActivity >= quietMs;
      if (settled || now - start >= maxMs) {
        clearInterval(timer);
        api.tabs.onCreated.removeListener(bump);
        api.windows.onCreated.removeListener(bump);
        resolve();
      }
    }, tickMs);
  });
}

/**
 * Returns `serialize(fn)`: runs async jobs one after another, so a "fix now"
 * click during the startup pass can't open the same tab twice.
 */
export function createSerializer() {
  let tail = Promise.resolve();
  return (job) => {
    const run = tail.then(job, job);
    tail = run.catch(() => {});
    return run;
  };
}
