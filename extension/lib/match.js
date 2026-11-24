// Pure logic: which open tab belongs to which saved link, and what to change.
// No browser APIs in here, so it runs in Firefox and in Node tests alike.

/**
 * Turn what the user typed into a clean web address, or null if it isn't one.
 * "gmail.com" -> "https://gmail.com/". The #hash is dropped.
 */
export function normalizeLink(input) {
  let text = String(input ?? '').trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  url.hash = '';
  return url.href;
}

function parts(address) {
  let url;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return {
    host: url.hostname.toLowerCase().replace(/^www\./, ''),
    port: url.port,
    path: url.pathname.replace(/\/+$/, '') || '/',
    params: url.searchParams,
  };
}

/**
 * How well a tab address fits a saved link.
 * -1 = not this link. Otherwise a number that grows with how specific the link is,
 * so "a.com/docs" beats "a.com/" for a tab on "a.com/docs/page".
 *
 * A tab fits when: same site (www., http/https and #hash ignored), same port,
 * its path is the link's path or below it, and it has every ?param the link has.
 */
export function matchScore(tabUrl, linkUrl) {
  const t = parts(tabUrl);
  const l = parts(linkUrl);
  if (!t || !l) return -1;
  if (t.host !== l.host || t.port !== l.port) return -1;

  if (l.path !== '/' && t.path !== l.path && !t.path.startsWith(`${l.path}/`)) return -1;

  let paramCount = 0;
  for (const [key, value] of l.params) {
    if (!t.params.getAll(key).includes(value)) return -1;
    paramCount += 1;
  }
  const pathWeight = l.path === '/' ? 0 : l.path.length;
  return pathWeight * 100 + paramCount;
}

/** Index of the most specific saved link this address belongs to, or -1. */
export function findLinkIndex(url, links) {
  let best = -1;
  let bestScore = -1;
  links.forEach((link, i) => {
    const score = matchScore(url, link);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

/** Append new addresses to a list: normalized, valid ones only, no duplicates. */
export function mergeLinks(existing, incoming) {
  const result = [...existing];
  for (const raw of incoming) {
    const link = normalizeLink(raw);
    if (link && !result.includes(link)) result.push(link);
  }
  return result;
}

/** True for a normal tab that sits inside one of Firefox's tab groups. */
function inTabGroup(tab) {
  return typeof tab.groupId === 'number' && tab.groupId !== -1;
}

/**
 * Decide how to make a window's pinned tabs match the saved list.
 *
 * @param {{id:number, url:string, pinned:boolean, index:number, groupId?:number}[]} tabs  all tabs in the window
 * @param {string[]} links  saved links, in the order the pinned tabs should appear
 * @param {{closeUnlisted?: boolean}} [options]  closeUnlisted (default true): close pinned tabs on no link
 * @returns {{order:(number|null)[], toPin:number[], toOpen:number[], toClose:number[]}}
 *   order   – per link, the id of the tab reused for it (null = must be opened)
 *   toPin   – ids of reused tabs that are not pinned yet
 *   toOpen  – indexes into `links` that need a new pinned tab
 *   toClose – ids of pinned tabs that belong to no link
 */
export function planReconcile(tabs, links, { closeUnlisted = true } = {}) {
  const valid = links.map((link) => normalizeLink(link) !== null);
  if (!valid.some(Boolean)) return { order: [], toPin: [], toOpen: [], toClose: [] };

  // Every (tab, link) pair that fits, best first: most specific link,
  // then a tab that is already pinned, then the left-most tab.
  // Tabs inside a tab group are never pulled out to be pinned.
  const pairs = [];
  for (const tab of tabs) {
    if (!tab.pinned && inTabGroup(tab)) continue;
    links.forEach((link, linkIndex) => {
      if (!valid[linkIndex]) return;
      const score = matchScore(tab.url, link);
      if (score >= 0) pairs.push({ tab, linkIndex, score });
    });
  }
  pairs.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.tab.pinned) - Number(a.tab.pinned) ||
      a.tab.index - b.tab.index,
  );

  const order = links.map(() => null);
  const used = new Set();
  for (const { tab, linkIndex } of pairs) {
    if (order[linkIndex] !== null || used.has(tab.id)) continue;
    order[linkIndex] = tab.id;
    used.add(tab.id);
  }

  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  return {
    order,
    toPin: order.filter((id) => id !== null && !byId.get(id).pinned),
    toOpen: order.flatMap((id, i) => (id === null && valid[i] ? [i] : [])),
    toClose: closeUnlisted
      ? tabs.filter((tab) => tab.pinned && !used.has(tab.id)).map((tab) => tab.id)
      : [],
  };
}
