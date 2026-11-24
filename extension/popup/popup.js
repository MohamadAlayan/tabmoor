import { getLinks } from '../lib/links.js';

const statusEl = document.getElementById('status');
const fixButton = document.getElementById('fix');
const addButton = document.getElementById('add');

function showStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = `status ${kind ?? ''}`;
}

function describeFix(result) {
  if (!result.ok) return result.message;
  const parts = [];
  if (result.opened) parts.push(`opened ${result.opened}`);
  if (result.pinned) parts.push(`pinned ${result.pinned}`);
  if (result.closed) parts.push(`closed ${result.closed}`);
  let text = parts.length ? `Done: ${parts.join(', ')}.` : 'All good, nothing to change.';
  if (result.failed?.length) text += ` Couldn't open ${result.failed.length} link(s).`;
  return text;
}

async function send(type) {
  const win = await browser.windows.getCurrent();
  return browser.runtime.sendMessage({ type, windowId: win.id });
}

async function run(button, type, describe) {
  fixButton.disabled = true;
  addButton.disabled = true;
  showStatus('Working…');
  try {
    const result = await send(type);
    showStatus(describe(result), result.ok && !result.failed?.length ? 'ok' : 'error');
  } catch (error) {
    showStatus(`Something went wrong: ${error.message}`, 'error');
  } finally {
    fixButton.disabled = false;
    addButton.disabled = false;
    refreshCount();
  }
}

async function refreshCount() {
  const links = await getLinks(browser);
  document.getElementById('count').textContent = `${links.length} link${links.length === 1 ? '' : 's'} saved`;
}

fixButton.addEventListener('click', () => run(fixButton, 'fix-now', describeFix));
addButton.addEventListener('click', () => run(addButton, 'add-page', (r) => r.message));
document.getElementById('settings').addEventListener('click', (event) => {
  event.preventDefault();
  browser.runtime.openOptionsPage();
  window.close();
});

refreshCount();
