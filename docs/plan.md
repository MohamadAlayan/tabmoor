# Tabmoor Implementation Plan

**Goal:** Firefox add-on that makes the main window's pinned tabs match a saved list on every start.

**Architecture:** Pure matching/planning logic in `extension/lib/match.js` (unit-tested in Node).
Side effects go through `extension/lib/reconcile.js`, which takes the `browser` API as a parameter
so tests can pass a fake. `background.js` wires Firefox events; popup and settings page talk to it.

**Tech stack:** WebExtension Manifest V3 (Firefox 140+), plain ES modules, `node --test`, Python build script.

**Spec:** `docs/design.md`

## Global constraints
- Only `http:`/`https:` links are stored or opened.
- An empty list never closes anything.
- Private windows and extra windows are never touched.

## Review focus
1. Empty list on startup → nothing closed (tested in `reconcile.test.js`).
2. Session restore still running when reconcile starts → wait for a quiet period first (`waitForQuiet`).
3. Tab that navigated inside a saved site (Gmail inbox → an email) → still matches, not reloaded.
4. Two saved links on one site (`a.com/` and `a.com/docs`) → each gets its own tab; most specific link wins.
5. "Fix now" pressed while startup reconcile runs → calls are serialized, no double-opened tabs.

## Tasks
1. `match.js`: `normalizeLink`, `matchScore`, `findLinkIndex`, `mergeLinks`, `planReconcile` + `tests/match.test.js`.
2. `reconcile.js`: `reconcileWindow`, `findMainWindow`, `waitForQuiet` + `tests/reconcile.test.js` with a fake API.
3. `links.js` storage helpers, `background.js` (startup, install import, messages, serialization).
4. Popup (fix now / add this page) and settings page (add, remove, reorder, import pinned tabs).
5. Logo (`icons/`), README, LICENSE, `scripts/build.py` → `dist/tabmoor-<version>.xpi`.
