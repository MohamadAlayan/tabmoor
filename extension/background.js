import { findLinkIndex, mergeLinks, normalizeLink } from './lib/match.js';
import { createSerializer, findMainWindow, reconcileWindow, waitForQuiet } from './lib/reconcile.js';
import { getLinks, saveLinks } from './lib/links.js';

const serialize = createSerializer();

/** Make one window's pinned tabs match the saved list. */
function fixWindow(windowId) {
  return serialize(async () => {
    const links = await getLinks(browser);
    if (!links.length) {
      return { ok: false, message: 'Your list is empty — add some links first.' };
    }
    const result = await reconcileWindow(browser, windowId, links);
    return { ok: true, ...result };
  });
}

/** Add the window's current page to the list and pin it. */
function addCurrentPage(windowId) {
  return serialize(async () => {
    const [tab] = await browser.tabs.query({ windowId, active: true });
    const link = tab ? normalizeLink(tab.url) : null;
    if (!link) {
      return { ok: false, message: 'Only web pages (http/https) can be added.' };
    }
    const links = await getLinks(browser);
    if (findLinkIndex(tab.url, links) !== -1) {
      return { ok: true, message: 'This page is already on your list.' };
    }
    await saveLinks(browser, [...links, link]);
    if (!tab.pinned) await browser.tabs.update(tab.id, { pinned: true });
    return { ok: true, message: 'Added to your list and pinned.' };
  });
}

// Every time Firefox starts: let the last session finish restoring, then fix the main window.
browser.runtime.onStartup.addListener(async () => {
  await waitForQuiet(browser);
  const win = await findMainWindow(browser);
  if (win) await fixWindow(win.id);
});

// First install: start the list from whatever is pinned right now, then show the settings page.
browser.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;
  const links = await getLinks(browser);
  if (!links.length) {
    const win = await findMainWindow(browser);
    if (win) {
      const pinned = await browser.tabs.query({ windowId: win.id, pinned: true });
      const imported = mergeLinks([], pinned.map((tab) => tab.url));
      if (imported.length) await saveLinks(browser, imported);
    }
  }
  await browser.runtime.openOptionsPage();
});

// Requests from the toolbar popup and the settings page.
browser.runtime.onMessage.addListener((message) => {
  const handlers = { 'fix-now': fixWindow, 'add-page': addCurrentPage };
  const handler = handlers[message?.type];
  if (!handler) return undefined;
  return handler(message.windowId).catch((error) => {
    console.error('Tabmoor:', error);
    return { ok: false, message: `Something went wrong: ${error.message}` };
  });
});
