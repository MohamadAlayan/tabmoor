import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLink,
  matchScore,
  findLinkIndex,
  mergeLinks,
  planReconcile,
} from '../extension/lib/match.js';

const tab = (id, url, pinned = false, index = id) => ({ id, url, pinned, index });

test('normalizeLink adds https and drops the #hash', () => {
  assert.equal(normalizeLink('gmail.com'), 'https://gmail.com/');
  assert.equal(normalizeLink('  https://a.com/x#top '), 'https://a.com/x');
  assert.equal(normalizeLink('http://localhost:3000/app'), 'http://localhost:3000/app');
});

test('normalizeLink rejects non-web and junk input', () => {
  assert.equal(normalizeLink(''), null);
  assert.equal(normalizeLink('about:config'), null);
  assert.equal(normalizeLink('file:///C:/x.txt'), null);
  assert.equal(normalizeLink('javascript:alert(1)'), null);
  assert.equal(normalizeLink('not a url at all'), null);
});

test('matchScore: same site and path prefix match, ignoring www, http/https and hash', () => {
  assert.ok(matchScore('https://mail.google.com/mail/u/0/#inbox/123', 'https://mail.google.com/mail/u/0/') >= 0);
  assert.ok(matchScore('http://www.example.com/', 'https://example.com/') >= 0);
  assert.ok(matchScore('https://a.com/docs/page', 'https://a.com/docs') >= 0);
});

test('matchScore: different site, port or sibling path does not match', () => {
  assert.equal(matchScore('https://b.com/', 'https://a.com/'), -1);
  assert.equal(matchScore('http://localhost:8080/', 'http://localhost:3000/'), -1);
  assert.equal(matchScore('https://a.com/docsearch', 'https://a.com/docs'), -1);
  assert.equal(matchScore('about:blank', 'https://a.com/'), -1);
});

test('matchScore: saved query params must be present on the tab', () => {
  const link = 'https://www.youtube.com/watch?v=AAA';
  assert.ok(matchScore('https://www.youtube.com/watch?v=AAA&t=30', link) >= 0);
  assert.equal(matchScore('https://www.youtube.com/watch?v=BBB', link), -1);
});

test('matchScore: more specific link scores higher', () => {
  const url = 'https://a.com/docs/page';
  assert.ok(matchScore(url, 'https://a.com/docs') > matchScore(url, 'https://a.com/'));
});

test('findLinkIndex returns the most specific matching link', () => {
  const links = ['https://a.com/', 'https://a.com/docs'];
  assert.equal(findLinkIndex('https://a.com/docs/x', links), 1);
  assert.equal(findLinkIndex('https://a.com/blog', links), 0);
  assert.equal(findLinkIndex('https://z.com/', links), -1);
});

test('mergeLinks normalizes, skips invalid and duplicates, keeps order', () => {
  const merged = mergeLinks(['https://a.com/'], ['b.com', 'about:blank', 'https://a.com/#x', 'https://b.com/']);
  assert.deepEqual(merged, ['https://a.com/', 'https://b.com/']);
});

test('planReconcile: empty list does nothing, even with pinned tabs open', () => {
  const plan = planReconcile([tab(1, 'https://a.com/', true)], []);
  assert.deepEqual(plan, { order: [], toPin: [], toOpen: [], toClose: [] });
});

test('planReconcile: reuses existing tabs, opens missing, closes unlisted pinned', () => {
  const tabs = [
    tab(1, 'https://old.com/', true, 0),          // pinned, not on list -> close
    tab(2, 'https://mail.google.com/mail/u/0/#inbox/9', true, 1), // pinned, on list -> keep
    tab(3, 'https://news.com/today', false, 2),   // unpinned, on list -> pin
    tab(4, 'https://random.com/', false, 3),      // unpinned, not on list -> untouched
  ];
  const links = ['https://news.com/', 'https://mail.google.com/mail/u/0/', 'https://cal.com/'];
  const plan = planReconcile(tabs, links);
  assert.deepEqual(plan.order, [3, 2, null]);
  assert.deepEqual(plan.toPin, [3]);
  assert.deepEqual(plan.toOpen, [2]);
  assert.deepEqual(plan.toClose, [1]);
});

test('planReconcile: no duplicates — one tab per link, prefers the pinned copy', () => {
  const tabs = [
    tab(1, 'https://a.com/', false, 0),
    tab(2, 'https://a.com/', true, 1),
  ];
  const plan = planReconcile(tabs, ['https://a.com/']);
  assert.deepEqual(plan.order, [2]);
  assert.deepEqual(plan.toPin, []);
  assert.deepEqual(plan.toClose, []);
});

test('planReconcile: two pinned copies of one link -> extra copy is closed', () => {
  const tabs = [tab(1, 'https://a.com/', true, 0), tab(2, 'https://a.com/x', true, 1)];
  const plan = planReconcile(tabs, ['https://a.com/']);
  assert.deepEqual(plan.order, [1]);
  assert.deepEqual(plan.toClose, [2]);
});

test('planReconcile: two links on one site each keep their own tab', () => {
  const tabs = [
    tab(1, 'https://a.com/docs/intro', true, 0),
    tab(2, 'https://a.com/', true, 1),
  ];
  const plan = planReconcile(tabs, ['https://a.com/', 'https://a.com/docs']);
  assert.deepEqual(plan.order, [2, 1]);
  assert.deepEqual(plan.toClose, []);
  assert.deepEqual(plan.toOpen, []);
});

test('planReconcile: never pulls a tab out of a tab group', () => {
  const tabs = [
    { id: 1, url: 'https://a.com/', pinned: false, index: 0, groupId: 7 },  // in a group -> leave alone
    { id: 2, url: 'https://b.com/', pinned: false, index: 1, groupId: -1 }, // not grouped -> reuse
  ];
  const plan = planReconcile(tabs, ['https://a.com/', 'https://b.com/']);
  assert.deepEqual(plan.order, [null, 2]);
  assert.deepEqual(plan.toPin, [2]);
  assert.deepEqual(plan.toOpen, [0]);
});

test('planReconcile: closeUnlisted=false keeps pinned tabs that are not on the list', () => {
  const tabs = [tab(1, 'https://old.com/', true, 0), tab(2, 'https://a.com/', true, 1)];
  const plan = planReconcile(tabs, ['https://a.com/'], { closeUnlisted: false });
  assert.deepEqual(plan.order, [2]);
  assert.deepEqual(plan.toClose, []);
});

test('planReconcile: a tab that wandered into a more specific saved path can still fill the general link', () => {
  // The root-link tab was navigated into /docs/2, and /docs already has its own tab.
  const tabs = [
    tab(1, 'https://a.com/docs/1', true, 0),
    tab(2, 'https://a.com/docs/2', true, 1),
  ];
  const plan = planReconcile(tabs, ['https://a.com/', 'https://a.com/docs']);
  assert.deepEqual(plan.order, [2, 1]);
  assert.deepEqual(plan.toClose, []);
  assert.deepEqual(plan.toOpen, []);
});
