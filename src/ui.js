/**
 * ui.js — UI Module
 * 
 * Mengatur semua interaksi DOM:
 * 1. Render daftar akun ke panel sidebar
 * 2. Render stats bar (total/available/limited)
 * 3. Handle modal form (add/edit akun)
 * 4. Handle confirm dialog (delete akun)
 * 5. Menghubungkan event-event ke accounts module
 */

import {
  getAccounts,
  addAccount,
  editAccount,
  removeAccount,
  getStats,
  onChange,
} from './accounts.js';

// --- DOM Elements ---
let accountListEl,
  statsBarEl,
  modalOverlay,
  confirmOverlay,
  accountForm,
  modalTitle,
  inputName,
  inputStatus,
  inputTime,
  inputId;

// Fungsi callback untuk update globe visuals
let onDataChange = null;

// ID akun yang sedang pending delete (untuk confirm dialog)
let pendingDeleteId = null;

/**
 * Inisialisasi UI.
 * 
 * @param {Function} updateGlobeVisuals - Callback yang dipanggil saat data berubah
 */
export function initUI(updateGlobeVisuals) {
  onDataChange = updateGlobeVisuals;

  // Ambil referensi ke DOM elements
  accountListEl = document.getElementById('account-list');
  statsBarEl = document.getElementById('stats-bar');
  modalOverlay = document.getElementById('modal-overlay');
  confirmOverlay = document.getElementById('confirm-overlay');
  accountForm = document.getElementById('account-form');
  modalTitle = document.getElementById('modal-title');
  inputName = document.getElementById('input-name');
  inputStatus = document.getElementById('input-status');
  inputTime = document.getElementById('input-time');
  inputId = document.getElementById('input-id');

  // --- Event Listeners ---

  // Tombol "Add" di panel header
  document.getElementById('btn-add-account').addEventListener('click', () => {
    openModal(); // Buka modal dalam mode "add"
  });

  // Tombol close modal
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);

  // Cancel button di modal
  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  // Submit form (add atau edit)
  accountForm.addEventListener('submit', handleFormSubmit);

  // Click overlay untuk close modal
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Confirm dialog buttons
  document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) closeConfirm();
  });

  // Keyboard shortcut: Escape untuk close modal/confirm
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) closeModal();
      if (!confirmOverlay.classList.contains('hidden')) closeConfirm();
    }
  });

  // Listen ke perubahan data dari accounts module
  onChange((accounts) => {
    renderAccountList(accounts);
    renderStats();
    if (onDataChange) onDataChange(accounts);
  });

  // Render awal
  const accounts = getAccounts();
  renderAccountList(accounts);
  renderStats();
  if (onDataChange) onDataChange(accounts);
}

/**
 * Render stats bar di header.
 * Menampilkan: Total, Available, Limited
 */
function renderStats() {
  const stats = getStats();

  statsBarEl.innerHTML = `
    <div class="stat-item total">
      <span class="stat-dot total"></span>
      <span class="stat-prefix">[</span>
      <span class="stat-label">SYS</span>
      <span class="stat-prefix">]</span>
      <span class="stat-value">${stats.total}</span>
    </div>
    <div class="stat-item available">
      <span class="stat-dot available"></span>
      <span class="stat-prefix">[</span>
      <span class="stat-label">ACT</span>
      <span class="stat-prefix">]</span>
      <span class="stat-value">${stats.available}</span>
    </div>
    <div class="stat-item limited">
      <span class="stat-dot limited"></span>
      <span class="stat-prefix">[</span>
      <span class="stat-label">LMT</span>
      <span class="stat-prefix">]</span>
      <span class="stat-value">${stats.limited}</span>
    </div>
  `;
}

/**
 * Render daftar akun ke sidebar panel.
 * 
 * Jika tidak ada akun, tampilkan empty state.
 * Setiap card punya tombol edit dan delete.
 * 
 * @param {Array} accounts
 */
function renderAccountList(accounts) {
  if (!accounts || accounts.length === 0) {
    accountListEl.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <p style="font-family:'JetBrains Mono',monospace;font-size:12px;">// no accounts registered<br>// run <strong style="color:var(--accent-cyan)">+ Add</strong> to begin</p>
      </div>
    `;
    return;
  }

  accountListEl.innerHTML = accounts
    .map(
      (account, index) => {
        const isAvailable = account.status === 'available';
        const statusLabel = isAvailable ? 'ONLINE' : 'BLOCKED';
        const statusTextClass = isAvailable ? 'available' : 'limited';
        const shortId = account.id.replace(/-/g, '').slice(0, 12).toUpperCase();

        return `
    <div class="account-card status-${account.status}" style="animation-delay: ${index * 0.08}s">
      <!-- Terminal-style header bar -->
      <div class="card-header-bar">
        <div class="card-header-left">
          <span class="card-status-indicator"></span>
          <span>${statusLabel}</span>
        </div>
        <div class="card-header-actions">
          <button class="btn-icon edit" title="Edit" data-action="edit" data-id="${account.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button class="btn-icon delete" title="Delete" data-action="delete" data-id="${account.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Card body with terminal-like meta info -->
      <div class="card-body">
        <div class="card-name">
          <span class="card-name-prefix">&gt;</span>
          ${escapeHtml(account.name)}
        </div>
        <div class="card-meta">
          <div class="card-meta-row">
            <span class="card-meta-key">status</span>
            <span class="card-meta-value status-text ${statusTextClass}">${isAvailable ? '● ACTIVE' : '✕ LIMITED'}</span>
          </div>
          ${account.limitTime ? `
          <div class="card-meta-row">
            <span class="card-meta-key">time</span>
            <span class="card-meta-value">${formatDateTime(account.limitTime)}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Footer with hex ID -->
      <div class="card-footer">0x${shortId}</div>
    </div>
  `;
      }
    )
    .join('');

  // Event delegation: satu listener di parent untuk semua button di cards
  accountListEl.addEventListener('click', handleCardAction);
}

/**
 * Handle klik pada tombol di dalam card akun.
 * Menggunakan event delegation: cek data-action dan data-id.
 */
function handleCardAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'edit') {
    openModal(id);
  } else if (action === 'delete') {
    openConfirm(id);
  }
}

/**
 * Buka modal form.
 * 
 * @param {string|null} editId - Jika ada, modal dalam mode edit. Jika null, mode add.
 */
function openModal(editId = null) {
  // Reset form
  accountForm.reset();
  inputId.value = '';

  if (editId) {
    // Mode Edit: isi form dengan data existing
    const accounts = getAccounts();
    const account = accounts.find((a) => a.id === editId);
    if (!account) return;

    modalTitle.textContent = '// edit_account';
    inputName.value = account.name;
    inputStatus.value = account.status;
    inputTime.value = account.limitTime
      ? account.limitTime.slice(0, 16) // Format "YYYY-MM-DDTHH:mm" untuk datetime-local
      : '';
    inputId.value = account.id;
  } else {
    // Mode Add
    modalTitle.textContent = '// new_account';
  }

  modalOverlay.classList.remove('hidden');
  // Focus ke field nama setelah animasi modal selesai
  setTimeout(() => inputName.focus(), 100);
}

/**
 * Tutup modal form.
 */
function closeModal() {
  modalOverlay.classList.add('hidden');
  accountForm.reset();
}

/**
 * Handle submit form (Add atau Edit).
 * 
 * Cek apakah inputId ada value:
 * - Ada → Edit mode, panggil editAccount()
 * - Kosong → Add mode, panggil addAccount()
 */
function handleFormSubmit(e) {
  e.preventDefault(); // Cegah form reload halaman

  const name = inputName.value.trim();
  const status = inputStatus.value;
  const limitTime = inputTime.value ? new Date(inputTime.value).toISOString() : null;
  const id = inputId.value;

  if (!name) return;

  if (id) {
    // Edit existing account
    editAccount(id, { name, status, limitTime });
  } else {
    // Add new account
    addAccount({ name, status, limitTime });
  }

  closeModal();
}

/**
 * Buka confirm dialog untuk delete.
 * @param {string} id - ID akun yang akan dihapus
 */
function openConfirm(id) {
  pendingDeleteId = id;

  // Tampilkan nama akun di dialog
  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === id);
  if (account) {
    document.getElementById('confirm-message').textContent =
      `terminate process "${account.name}"?`;
  }

  confirmOverlay.classList.remove('hidden');
}

/**
 * Tutup confirm dialog.
 */
function closeConfirm() {
  confirmOverlay.classList.add('hidden');
  pendingDeleteId = null;
}

/**
 * Handle klik tombol "Delete" di confirm dialog.
 */
function handleConfirmDelete() {
  if (pendingDeleteId) {
    removeAccount(pendingDeleteId);
  }
  closeConfirm();
}

/**
 * Format ISO datetime string ke format yang readable.
 * Contoh: "2026-03-08T12:00:00.000Z" → "08 Mar 2026, 19:00"
 * 
 * @param {string} isoString
 * @returns {string}
 */
function formatDateTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

/**
 * Escape HTML untuk mencegah XSS.
 * Penting ketika menampilkan user input di innerHTML.
 * 
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
