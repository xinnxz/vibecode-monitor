/**
 * command-palette.js — Command Palette Module (Ctrl+K)
 *
 * Fitur utama:
 * 1. Buka/tutup palette via Ctrl+K atau Cmd+K
 * 2. Fuzzy search nama akun (langsung menampilkan hasil)
 * 3. Command mode: ketik "> add", "> clear", "> settings" untuk aksi cepat
 * 4. Navigasi hasil pakai Arrow Up/Down + Enter
 * 5. Klik hasil untuk eksekusi aksi (Edit akun / jalankan command)
 */

import { getAccounts } from './accounts.js';
import { getProvider } from './providers.js';
import { playClick } from './sounds.js';

// DOM refs
let overlay, input, resultsEl;

// State
let activeIndex = -1;
let currentResults = [];

// Callback references (diset dari luar via init)
let onEditAccount = null;
let onOpenAddModal = null;
let onClearNotifications = null;
let onOpenSettings = null;

/**
 * Inisialisasi Command Palette.
 * Dipanggil sekali dari main.js atau ui.js.
 *
 * @param {Object} callbacks
 *   - editAccount(id): buka modal edit untuk akun tertentu
 *   - openAddModal(): buka modal tambah akun baru
 *   - clearNotifications(): bersihkan semua notifikasi
 *   - openSettings(): buka modal settings
 */
export function initCommandPalette(callbacks = {}) {
  overlay = document.getElementById('cmd-overlay');
  input = document.getElementById('cmd-input');
  resultsEl = document.getElementById('cmd-results');

  if (!overlay || !input || !resultsEl) return;

  onEditAccount = callbacks.editAccount || null;
  onOpenAddModal = callbacks.openAddModal || null;
  onClearNotifications = callbacks.clearNotifications || null;
  onOpenSettings = callbacks.openSettings || null;

  // Global shortcut: Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggle();
    }
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Input events
  input.addEventListener('input', () => {
    search(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeSelected();
    }
  });
}

/**
 * Toggle Command Palette visibility.
 */
function toggle() {
  if (overlay.classList.contains('hidden')) {
    open();
  } else {
    close();
  }
}

/**
 * Buka Command Palette.
 */
function open() {
  overlay.classList.remove('hidden');
  input.value = '';
  resultsEl.innerHTML = '';
  activeIndex = -1;
  currentResults = [];

  // Show default suggestions
  showDefaultSuggestions();

  setTimeout(() => input.focus(), 50);
}

/**
 * Tutup Command Palette.
 */
function close() {
  overlay.classList.add('hidden');
  input.value = '';
  resultsEl.innerHTML = '';
  activeIndex = -1;
  currentResults = [];
}

/**
 * Tampilkan saran default (commands) saat palette baru dibuka.
 */
function showDefaultSuggestions() {
  const commands = getCommandList();
  currentResults = commands;
  renderResults(commands);
}

/**
 * Cari akun atau command berdasarkan query.
 */
function search(query) {
  const q = query.trim().toLowerCase();

  if (!q) {
    showDefaultSuggestions();
    return;
  }

  // Command mode: query starts with ">"
  if (q.startsWith('>')) {
    const cmdQuery = q.slice(1).trim();
    const commands = getCommandList().filter(c =>
      c.title.toLowerCase().includes(cmdQuery) ||
      c.subtitle.toLowerCase().includes(cmdQuery)
    );
    currentResults = commands;
    renderResults(commands);
    return;
  }

  // Account search mode
  const accounts = getAccounts();
  const matchedAccounts = accounts
    .filter(a => a.name.toLowerCase().includes(q))
    .slice(0, 8)
    .map(a => {
      const provArr = Array.isArray(a.provider) ? a.provider : [];
      const provNames = provArr.map(pid => {
        const p = getProvider(pid);
        return p ? p.name : pid;
      }).join(', ');

      return {
        type: 'account',
        id: a.id,
        icon: '📋',
        title: a.name,
        subtitle: provNames || 'No provider',
        status: a.status,
        action: () => {
          if (onEditAccount) onEditAccount(a.id);
        },
      };
    });

  // Also show matching commands
  const matchedCommands = getCommandList().filter(c =>
    c.title.toLowerCase().includes(q)
  );

  currentResults = [...matchedAccounts, ...matchedCommands];
  renderResults(currentResults);
}

/**
 * Daftar command yang bisa dijalankan.
 */
function getCommandList() {
  return [
    {
      type: 'command',
      icon: '➕',
      title: 'New Account',
      subtitle: 'Add a new monitored account',
      action: () => { if (onOpenAddModal) onOpenAddModal(); },
    },
    {
      type: 'command',
      icon: '🔔',
      title: 'Clear Notifications',
      subtitle: 'Clear all notification history',
      action: () => { if (onClearNotifications) onClearNotifications(); },
    },
    {
      type: 'command',
      icon: '⚙️',
      title: 'Settings',
      subtitle: 'Open webhook & notification settings',
      action: () => { if (onOpenSettings) onOpenSettings(); },
    },
  ];
}

/**
 * Render hasil pencarian ke DOM.
 */
function renderResults(results) {
  activeIndex = results.length > 0 ? 0 : -1;

  resultsEl.innerHTML = results.map((r, i) => {
    const activeClass = i === 0 ? ' active' : '';
    const badgeHtml = r.status
      ? `<span class="cmd-result-badge ${r.status}">${r.status}</span>`
      : '';

    return `
      <div class="cmd-result-item${activeClass}" data-index="${i}">
        <span class="cmd-result-icon">${r.icon}</span>
        <div class="cmd-result-text">
          <div class="cmd-result-title">${escapeHtml(r.title)}</div>
          <div class="cmd-result-subtitle">${escapeHtml(r.subtitle)}</div>
        </div>
        ${badgeHtml}
      </div>
    `;
  }).join('');

  // Click handler for each result
  resultsEl.querySelectorAll('.cmd-result-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10);
      if (currentResults[idx]) {
        playClick();
        close();
        currentResults[idx].action();
      }
    });
  });
}

/**
 * Pindahkan selection atas/bawah.
 */
function moveSelection(delta) {
  if (currentResults.length === 0) return;

  // Remove current active
  const items = resultsEl.querySelectorAll('.cmd-result-item');
  if (items[activeIndex]) items[activeIndex].classList.remove('active');

  // Calculate new index (wrap around)
  activeIndex = (activeIndex + delta + currentResults.length) % currentResults.length;

  // Set new active
  if (items[activeIndex]) {
    items[activeIndex].classList.add('active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }
}

/**
 * Jalankan aksi dari item yang sedang aktif.
 */
function executeSelected() {
  if (activeIndex >= 0 && activeIndex < currentResults.length) {
    playClick();
    close();
    currentResults[activeIndex].action();
  }
}

/**
 * Simple HTML escape utility.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
