# Firefox Add-ons (AMO) listing — copy & paste

Everything below goes into the form at https://addons.mozilla.org/developers/ → **Submit a New Add-on**.

## Steps

1. Build the file: `python scripts/build.py` → `dist/tabmoor-1.0.0.xpi`.
2. Sign in at https://addons.mozilla.org/developers/ with a Mozilla account and accept the Developer Agreement (first time only).
3. **Submit a New Add-on** → **On this site** → upload the `.xpi` → tick **Firefox** only → Continue.
   The automatic validator runs; it should pass with no errors.
4. Source code question → **No**.
5. Fill in **Describe add-on** with the fields below (name, summary, description, category, support, license).
6. Add the **notes to reviewer** below, then **Submit Version**.
7. After approval (often within hours, sometimes a few days), open the listing page and add the two
   screenshots under **Edit Product Page → Images**.
8. Install it from the store page: it stays after restarts and updates automatically.
   Remove the temporary copy from `about:debugging` first.

For later versions: bump `version` in `extension/manifest.json`, build, then **Upload New Version** on the Developer Hub.

## Upload step

| Field | Value |
|---|---|
| How to distribute | **On this site** (public listing) |
| Compatible platforms | **Firefox** only — untick **Firefox for Android** (Android has no pinned tabs) |
| File | `dist/tabmoor-1.0.0.xpi` (build it with `python scripts/build.py`) |
| Do you need to submit source code? | **No** — the code is plain, readable JavaScript (not minified, bundled or transpiled) |

## Describe add-on

**Name**

```
Tabmoor
```

**Add-on URL (slug)**

```
tabmoor
```

**Summary** (250 characters max)

```
Keeps your favourite sites open as pinned tabs every time Firefox starts. Reuses tabs that are already open (no duplicates), brings pinned tabs back if you close the wrong window, and never touches your tab groups.
```

**Description**

```
Pinned tabs get lost: you close one by accident, close the wrong window, or the session doesn't come back. Tabmoor keeps a list of your favourite sites and, every time Firefox starts, makes your pinned tabs match it.

WHAT IT DOES
• Opens your links as pinned tabs on every start, in the order you choose.
• No duplicates: if a site is already open (restored from last time, or as a normal tab), Tabmoor pins that tab instead of opening a second copy.
• Doesn't reload sites you're using: a tab still counts as yours after you click around inside the site (for example, your Gmail tab showing an email).
• Rescues your pinned tabs when you close the wrong window. Firefox normally throws them away; Tabmoor brings them back in the window that's left.
• Keeps the pinned row clean: pinned tabs that aren't on your list are closed. Prefer to keep them? Switch it off in the settings.
• Leaves your tab groups alone: a tab inside a group is never pulled out and pinned.

TOOLBAR BUTTON
• Fix pinned tabs: put everything back right now, e.g. after closing one by mistake.
• Add this page: save the site you're on to your list and pin it.

SETTINGS
• Add, remove and reorder your links.
• Import the tabs you have pinned right now. On first install this happens automatically, so you start with your current setup.
• Your list follows you to other computers when Firefox Sync is on.

PRIVACY
Tabmoor collects nothing and makes no network requests. It only asks for two permissions: "tabs" (to see which sites are open and pin them) and "storage" (to remember your list).

Open source (MIT): https://github.com/MohamadAlayan/tabmoor
```

**Categories**: **Tabs**

**Tags** (pick from AMO's list where available): `tabs`, `tab manager`, `productivity`, `startup`

**Support website**

```
https://github.com/MohamadAlayan/tabmoor/issues
```

**Support email**: leave empty (or add one you're happy to make public).

**License**: **MIT License**

**Privacy policy**: not needed — the add-on collects no data (the manifest declares `data_collection_permissions: none`).

**Homepage**

```
https://github.com/MohamadAlayan/tabmoor
```

## Notes to reviewer

```
Tabmoor keeps a user-defined list of links open as pinned tabs.

Permissions:
- tabs: read tab URLs to match open tabs against the saved list, and pin / move / open / close tabs in the main window.
- storage: storage.sync holds the list and one setting; storage.session holds the id of the window that holds the pinned tabs.

No remote code, no network requests, no data collection. Source is plain ES modules, not minified or bundled; the same code is on GitHub with tests (node --test tests/).

How to test:
1. Install; the settings page opens and imports any currently pinned tabs.
2. Add a link (e.g. example.com), click "Apply to this window now" -> it opens as a pinned tab.
3. Restart Firefox -> pinned tabs match the list, with no duplicates.
4. Open a second window, close the first one -> the pinned tabs come back in the second window.
```

## Images

| What | File |
|---|---|
| Icon (128×128, if asked) | `docs/store/icon-128.png` (the manifest's SVG icon is used automatically) |
| Screenshot 1 | `docs/store/screenshot-1-settings.png` — caption: *Your list of pinned sites, in your order* |
| Screenshot 2 | `docs/store/screenshot-2-popup.png` — caption: *Fix pinned tabs or add the current page in one click* |
