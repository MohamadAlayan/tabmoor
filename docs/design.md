# Tabmoor — Firefox add-on (short design)

## Why
The user keeps a set of sites as pinned tabs and often loses them (closed by
accident, session not restored). They want those links pinned every time
Firefox opens, without duplicates.

## Goals
- A saved list of links, editable in a settings page (add, remove, reorder).
- On browser start, the main window's pinned tabs become exactly that list.
- On-demand "fix pinned tabs now" and "add this page to my list" from a toolbar button.

## Non-goals / anti-goals
- No duplicates: an already-open tab for a saved link is reused, never reopened.
- Never reload a saved site just because the user navigated inside it.
- Do not touch private windows or extra windows.

## Approaches
1. **WebExtension add-on (picked).** Only option that can pin tabs and dedupe.
2. Firefox "Homepage" with multiple URLs — opens tabs, but not pinned, and duplicates on session restore.
3. Bookmark folder + "Open all" — manual every time.
(Enterprise policies have no pinned-tab option.)

## Decided behavior
- **Unlisted pinned tabs are closed** (user's choice) on startup and when "fix now" is pressed.
- Startup: wait for session restore to settle (a few seconds), then reconcile the
  focused normal window:
  1. For each saved link, find a matching tab (pinned first, then unpinned) and pin it.
  2. Open missing links as new pinned tabs.
  3. Close pinned tabs that match no saved link.
  4. Move pinned tabs into list order.
- Links stored in `storage.sync` (follows the user's Firefox account).

## Added after the competitor review (2026-11-24)
- **Window rescue:** when the window holding the pinned tabs is closed and another normal
  window remains, restore the list there (restore only: nothing is closed in that window).
  The managed window id is kept in `storage.session`.
- **Tab groups:** an unpinned tab inside a tab group (`groupId !== -1`) is never reused/pinned.
- **Setting `closeUnlisted`** (default on, stored in `storage.sync` under `settings`):
  when off, unlisted pinned tabs are kept after the user's pinned tabs.

## Builder's calls
- **Matching rule:** a tab matches a saved link when it has the same host and its
  path starts with the saved link's path (query/hash ignored). Most specific
  (longest path) saved link wins; each tab matches at most one link.
- Settle wait: ~4 seconds after `runtime.onStartup`, plus a short quiet period.
- Manifest V3 with a background script, explicit add-on ID (needed for sync storage and signing).
- Deliverables: source folder, a zipped `.xpi`, and install instructions
  (signing as an unlisted add-on on addons.mozilla.org, or Developer Edition).
