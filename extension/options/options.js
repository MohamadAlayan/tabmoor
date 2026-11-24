import { mergeLinks, normalizeLink, planReconcile } from '../lib/match.js';
import { getLinks, getSettings, saveLinks, saveSettings, watchLinks } from '../lib/storage.js';

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const statusEl = document.getElementById('status');
const input = document.getElementById('new-link');
const rowTemplate = document.getElementById('row');
const closeUnlistedBox = document.getElementById('close-unlisted');

let links = [];
let settings = await getSettings(browser);

function showStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = `status ${kind ?? ''}`;
}

function hostOf(link) {
  try {
    return new URL(link).host.replace(/^www\./, '');
  } catch {
    return link;
  }
}

function render() {
  listEl.replaceChildren();
  links.forEach((link, i) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('.num').textContent = String(i + 1);
    row.querySelector('.host').textContent = hostOf(link);
    row.querySelector('.url').textContent = link;
    row.querySelector('.url').title = link;
    const up = row.querySelector('.up');
    const down = row.querySelector('.down');
    up.disabled = i === 0;
    down.disabled = i === links.length - 1;
    up.addEventListener('click', () => move(i, i - 1));
    down.addEventListener('click', () => move(i, i + 1));
    row.querySelector('.remove').addEventListener('click', () => remove(i));
    listEl.append(row);
  });
  emptyEl.hidden = links.length > 0;
}

async function update(next, message) {
  try {
    await saveLinks(browser, next);
    links = next;
    render();
    if (message) showStatus(message, 'ok');
  } catch (error) {
    showStatus(`Couldn't save: ${error.message}`, 'error');
  }
}

function move(from, to) {
  if (to < 0 || to >= links.length) return;
  const next = [...links];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  update(next);
}

function remove(index) {
  const removed = links[index];
  update(links.filter((_, i) => i !== index), `Removed ${hostOf(removed)}.`);
}

document.getElementById('add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const link = normalizeLink(input.value);
  if (!link) {
    showStatus('That doesn’t look like a web address (http or https).', 'error');
    return;
  }
  if (links.includes(link)) {
    showStatus('That link is already on the list.', 'error');
    return;
  }
  input.value = '';
  update([...links, link], `Added ${hostOf(link)}.`);
});

document.getElementById('import').addEventListener('click', async () => {
  const win = await browser.windows.getCurrent();
  const pinned = await browser.tabs.query({ windowId: win.id, pinned: true });
  const next = mergeLinks(links, pinned.map((tab) => tab.url));
  const added = next.length - links.length;
  if (!added) {
    showStatus('No new pinned web pages to import in this window.');
    return;
  }
  update(next, `Imported ${added} link${added === 1 ? '' : 's'}.`);
});

document.getElementById('apply').addEventListener('click', async () => {
  if (!links.length) {
    showStatus('Add some links first.', 'error');
    return;
  }
  const win = await browser.windows.getCurrent();
  const tabs = await browser.tabs.query({ windowId: win.id });
  const { toClose } = planReconcile(tabs, links, { closeUnlisted: settings.closeUnlisted });
  if (toClose.length) {
    const ok = window.confirm(
      `This will close ${toClose.length} pinned tab${toClose.length === 1 ? '' : 's'} in this window that ${toClose.length === 1 ? "isn't" : "aren't"} on your list. Continue?`,
    );
    if (!ok) return;
  }
  const result = await browser.runtime.sendMessage({ type: 'fix-now', windowId: win.id });
  if (!result.ok) {
    showStatus(result.message, 'error');
  } else if (result.failed.length) {
    showStatus(`Applied, but couldn't open: ${result.failed.join(', ')}`, 'error');
  } else {
    showStatus('Applied to this window.', 'ok');
  }
});

closeUnlistedBox.checked = settings.closeUnlisted;
closeUnlistedBox.addEventListener('change', async () => {
  try {
    await saveSettings(browser, { closeUnlisted: closeUnlistedBox.checked });
    settings = { ...settings, closeUnlisted: closeUnlistedBox.checked };
    showStatus(
      closeUnlistedBox.checked
        ? 'Pinned tabs not on your list will be closed.'
        : 'Pinned tabs not on your list will be kept.',
      'ok',
    );
  } catch (error) {
    closeUnlistedBox.checked = settings.closeUnlisted;
    showStatus(`Couldn't save: ${error.message}`, 'error');
  }
});

// Stay in sync with changes made from the toolbar button or another device.
watchLinks(browser, (next) => {
  links = next;
  render();
});

links = await getLinks(browser);
render();
