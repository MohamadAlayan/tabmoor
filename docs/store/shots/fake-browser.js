// Demo stand-in for Firefox's `browser` API, used only to render store screenshots
// of the real popup and settings pages outside Firefox.
(() => {
  const store = {
    links: [
      'https://www.google.com/',
      'https://www.youtube.com/',
      'https://www.wikipedia.org/',
      'https://www.apple.com/',
      'https://www.amazon.com/',
    ],
    settings: { closeUnlisted: true },
  };
  window.browser = {
    storage: {
      sync: {
        get: async (key) => ({ [key]: store[key] }),
        set: async (items) => Object.assign(store, items),
      },
      session: { get: async () => ({}), set: async () => {} },
      onChanged: { addListener() {} },
    },
    windows: { getCurrent: async () => ({ id: 1 }) },
    tabs: { query: async () => [] },
    runtime: {
      sendMessage: async () => ({ ok: true, opened: 2, pinned: 1, closed: 1, failed: [] }),
      openOptionsPage: async () => {},
    },
  };

  if (new URLSearchParams(location.search).get('demo') === 'fix') {
    window.addEventListener('load', () => setTimeout(() => document.getElementById('fix')?.click(), 200));
  }
})();
