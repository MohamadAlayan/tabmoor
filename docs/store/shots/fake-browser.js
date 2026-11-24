// Demo stand-in for Firefox's `browser` API, used only to render store screenshots
// of the real popup and settings pages outside Firefox.
(() => {
  const store = {
    links: [
      'https://mail.google.com/mail/u/0/',
      'https://calendar.google.com/calendar/u/0/r',
      'https://github.com/notifications',
      'https://web.whatsapp.com/',
      'https://www.notion.so/my-workspace',
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
