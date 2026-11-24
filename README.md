<p align="center">
  <img src="docs/banner.svg" alt="Tabmoor: your pinned tabs, moored in place" width="100%">
</p>

# Tabmoor

**A Firefox add-on that keeps your favourite sites open as pinned tabs every time Firefox starts.**

Pinned tabs get lost: you close one by accident, the session doesn't restore, or a crash wipes them.
Tabmoor keeps a list of your links, and every time Firefox opens it makes your pinned tabs match that list.

## What it does

- **Opens your links as pinned tabs on every start**, in the order you choose.
- **Never duplicates.** If a site is already open (restored from last time, or as a normal tab), Tabmoor pins that tab instead of opening a second copy.
- **Keeps the pinned row clean.** Pinned tabs that aren't on your list are closed. You can switch this off in the settings, and Ctrl+Shift+T brings a closed tab back.
- **Rescues pinned tabs when you close the wrong window.** Firefox normally throws pinned tabs away when you close their window, even if another window is open. Tabmoor brings them back in the window that's left.
- **Leaves your tab groups alone.** A tab inside a tab group is never pulled out and pinned.
- **Doesn't reload sites you're using.** A tab still counts as yours after you click around inside the site. For example, a saved Gmail inbox tab that's now showing an email.
- **Toolbar button:**
  - **Fix pinned tabs:** restore everything right now, e.g. after closing one by mistake.
  - **Add this page:** save the site you're on to the list and pin it.
- **Settings page:** add, remove and reorder links, or import the tabs you have pinned right now.
- **Your list follows you** to other computers if Firefox Sync is on with add-ons syncing.
- On first install, it **imports the tabs you already have pinned**, so you start with your current setup.

Private windows and extra windows are never touched. Only the main window is managed.

## Install

Firefox only keeps add-ons signed by Mozilla. Signing is free, takes a few minutes, and the add-on doesn't have to be public.

### Option 1: Sign it yourself (recommended, works in normal Firefox)

1. Build the package: `python scripts/build.py` → creates `dist/tabmoor-1.0.0.xpi`.
   (Or download it from the [Releases page](https://github.com/MohamadAlayan/tabmoor/releases), if one is published.)
2. Go to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/) and sign in with a Firefox account.
3. Click **Submit a New Add-on**, then choose **On your own** (this keeps it private/unlisted).
4. Upload the `.xpi`. Mozilla's automatic review usually signs it within minutes.
5. Download the signed `.xpi` and drag it onto any Firefox window, then click **Add**.

### Option 2: Firefox Developer Edition or Nightly (no signing)

1. Open `about:config` and set `xpinstall.signatures.required` to `false`.
2. Open `about:addons` → ⚙️ → **Install Add-on From File…** → choose `dist/tabmoor-1.0.0.xpi`.

### Option 3: Quick test (removed when Firefox restarts)

Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → choose `extension/manifest.json`.

> **Tip:** Firefox may put the Tabmoor button in the extensions menu (the puzzle-piece icon).
> Open that menu, click the ⚙️ next to Tabmoor, and choose **Pin to Toolbar**.

## How it decides which tab is "yours"

A tab matches a saved link when:

- it's the **same site** (`www.`, `http`/`https` and the `#…` part are ignored),
- its address is the saved path **or anywhere below it** (`/mail/u/0/` matches `/mail/u/0/#inbox/123`),
- it has every `?parameter` the saved link has (so two YouTube videos stay two separate links).

If two saved links fit one tab, the more specific link gets it.

Some sites change their address when they load (for example `gmail.com` → `mail.google.com`).
For those, add the page with the toolbar button while you're on it, so the exact address is saved.

## Privacy

Tabmoor collects nothing and makes no network requests. Your list is stored in Firefox's own add-on storage.

## Development

```
extension/            the add-on itself (this folder is what gets packaged)
  manifest.json
  background.js       startup, install, and toolbar-button requests
  lib/match.js        pure logic: matching tabs to links, planning changes
  lib/reconcile.js    applies the plan to real tabs
  lib/storage.js      saved list, settings, and which window holds the pinned tabs
  popup/              toolbar button
  options/            settings page
  icons/              logo (full and small)
tests/                Node tests (match + reconcile with a fake Firefox API)
scripts/build.py      packages extension/ into dist/tabmoor-<version>.xpi
docs/                 design notes, plan, banner
```

Requirements: Node 20+ for tests and Python 3 for the build script. There are no dependencies to install.

```
npm test                 # or: node --test tests/
python scripts/build.py  # creates dist/tabmoor-<version>.xpi
```

Optional, if you use Mozilla's [web-ext](https://github.com/mozilla/web-ext) tool:
`npx web-ext lint --source-dir extension` checks the add-on the same way Mozilla's reviewers do.

To release a new version: bump `version` in `extension/manifest.json`, build, and sign again.

## License

[MIT](LICENSE)
