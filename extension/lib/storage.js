// Saved list and settings live in storage.sync, so they follow the user's Firefox
// account (when add-on sync is on) and simply stay local otherwise.
// Which window currently holds the pinned tabs lives in storage.session (gone on restart).

export const LINKS_KEY = 'links';
export const SETTINGS_KEY = 'settings';
const MANAGED_WINDOW_KEY = 'managedWindowId';

export const DEFAULT_SETTINGS = Object.freeze({
  // Close pinned tabs that aren't on the list (startup and "Fix pinned tabs").
  closeUnlisted: true,
});

export async function getLinks(api) {
  const stored = await api.storage.sync.get(LINKS_KEY);
  const links = stored[LINKS_KEY];
  return Array.isArray(links) ? links.filter((link) => typeof link === 'string') : [];
}

export async function saveLinks(api, links) {
  await api.storage.sync.set({ [LINKS_KEY]: links });
}

export async function getSettings(api) {
  const stored = await api.storage.sync.get(SETTINGS_KEY);
  const saved = stored[SETTINGS_KEY];
  return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export async function saveSettings(api, changes) {
  const current = await getSettings(api);
  await api.storage.sync.set({ [SETTINGS_KEY]: { ...current, ...changes } });
}

export async function getManagedWindowId(api) {
  const stored = await api.storage.session.get(MANAGED_WINDOW_KEY);
  return stored[MANAGED_WINDOW_KEY] ?? null;
}

export async function setManagedWindowId(api, windowId) {
  await api.storage.session.set({ [MANAGED_WINDOW_KEY]: windowId });
}

/** Calls `onChange(newLinks)` whenever the list changes (from any page or device). */
export function watchLinks(api, onChange) {
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[LINKS_KEY]) onChange(changes[LINKS_KEY].newValue ?? []);
  });
}
