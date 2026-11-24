// The saved list lives in storage.sync, so it follows the user's Firefox account
// (when add-on sync is on) and simply stays local otherwise.

export const LINKS_KEY = 'links';

export async function getLinks(api) {
  const stored = await api.storage.sync.get(LINKS_KEY);
  const links = stored[LINKS_KEY];
  return Array.isArray(links) ? links.filter((link) => typeof link === 'string') : [];
}

export async function saveLinks(api, links) {
  await api.storage.sync.set({ [LINKS_KEY]: links });
}

/** Calls `onChange(newLinks)` whenever the list changes (from any page or device). */
export function watchLinks(api, onChange) {
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[LINKS_KEY]) onChange(changes[LINKS_KEY].newValue ?? []);
  });
}
