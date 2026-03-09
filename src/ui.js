/**
 * ui.js — UI Module
 * 
 * Mengatur semua interaksi DOM:
 * 1. Render daftar akun ke panel sidebar
 * 2. Render stats bar (total/available/limited)
 * 3. Handle modal form (add/edit akun)
 * 4. Handle confirm dialog (delete akun)
 * 5. Filter akun (All / Active / Limited)
 * 6. Live countdown timer (update setiap detik)
 * 7. Notifikasi saat akun ready
 */

import {
  fetchAccounts,
  getAccounts,
  addAccount,
  editAccount,
  removeAccount,
  getStats,
  onChange,
} from './accounts.js';

import { sendNotification, showToast } from './notifications.js';

// --- DOM Elements ---
let accountListEl,
  statsBarEl,
  modalOverlay,
  confirmOverlay,
  accountForm,
  modalTitle,
  inputName,
  inputStatus,
  inputDays,
  inputHours,
  inputId;

// Fungsi callback untuk update globe visuals
let onDataChange = null;

// ID akun yang sedang pending delete (untuk confirm dialog)
let pendingDeleteId = null;

// Filter state: 'all' | 'available' | 'limited'
let currentFilter = 'all';

// Set untuk track akun yang sudah pernah di-notify (cegah duplikat)
const notifiedIds = new Set();

// Interval ID untuk countdown timer
let countdownInterval = null;

/**
 * Inisialisasi UI.
 * 
 * @param {Function} updateGlobeVisuals - Callback yang dipanggil saat data berubah
 */
export async function initUI(updateGlobeVisuals) {
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
  inputDays = document.getElementById('input-days');
  inputHours = document.getElementById('input-hours');
  inputId = document.getElementById('input-id');

  // Fix scroll: Stop wheel event dari ditelan oleh Three.js OrbitControls
  const sidePanel = document.getElementById('side-panel');
  sidePanel.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: true });

  // --- Event Listeners ---

  // Tombol "Add" di panel header
  document.getElementById('btn-add-account').addEventListener('click', () => {
    openModal();
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

  // --- Filter Buttons ---
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Set filter dan re-render
      currentFilter = btn.dataset.filter;
      renderAccountList(getAccounts());
    });
  });

  // Listen ke perubahan data dari accounts module
  onChange((accounts) => {
    renderAccountList(accounts);
    renderStats();
    if (onDataChange) onDataChange(accounts);
  });

  // Render loading state, lalu fetch dari Supabase
  renderStats();
  accountListEl.innerHTML = `
    <div class="empty-state">
      <p style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-cyan)">// loading accounts from database...</p>
    </div>
  `;

  // Fetch data dari Supabase
  const accounts = await fetchAccounts();
  renderAccountList(accounts);
  renderStats();
  if (onDataChange) onDataChange(accounts);

  // Start countdown timer — update setiap 1 detik
  startCountdownTimer();
}

/**
 * Render stats bar di header.
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
 * Render daftar akun ke sidebar panel, dengan filter applied.
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

  // Apply filter
  const filtered = currentFilter === 'all'
    ? accounts
    : accounts.filter((a) => a.status === currentFilter);

  if (filtered.length === 0) {
    accountListEl.innerHTML = `
      <div class="empty-state">
        <p style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">// no ${currentFilter} accounts found</p>
      </div>
    `;
    return;
  }

  accountListEl.innerHTML = filtered
    .map(
      (account, index) => {
        const isAvailable = account.status === 'available';
        const statusLabel = isAvailable ? 'ONLINE' : 'BLOCKED';
        const statusTextClass = isAvailable ? 'available' : 'limited';
        const shortId = account.id.replace(/-/g, '').slice(0, 12).toUpperCase();
        const countdownHtml = renderCountdown(account);

        return `
    <div class="account-card status-${account.status}" style="animation-delay: ${index * 0.08}s" data-account-id="${account.id}">
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
          <div class="card-meta-row">
            <span class="card-meta-key">reset</span>
            <span class="card-meta-value countdown-value" data-deadline="${account.refreshDeadline || ''}">${countdownHtml}</span>
          </div>
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
 * Render countdown string dari deadline.
 * 
 * Menghitung selisih antara deadline dan waktu sekarang,
 * lalu format ke "Xd Xh Xm Xs" atau "READY ✓" jika sudah lewat.
 * 
 * @param {Object} account - Account object
 * @returns {string} HTML string untuk countdown display
 */
function renderCountdown(account) {
  const deadline = account.refreshDeadline;

  // Fallback: jika tidak ada deadline, tampilkan static days/hours
  if (!deadline) {
    return formatDurationLegacy(account.refreshDays, account.refreshHours);
  }

  const now = Date.now();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return '<span class="countdown-ready">READY ✓</span>';
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const parts = [];
  if (days > 0) parts.push(`<span class="cd-num">${days}</span><span class="cd-unit">d</span>`);
  if (hours > 0 || days > 0) parts.push(`<span class="cd-num">${String(hours).padStart(2, '0')}</span><span class="cd-unit">h</span>`);
  parts.push(`<span class="cd-num">${String(minutes).padStart(2, '0')}</span><span class="cd-unit">m</span>`);
  parts.push(`<span class="cd-num">${String(seconds).padStart(2, '0')}</span><span class="cd-unit">s</span>`);

  return parts.join(' ');
}

/**
 * Start interval yang update semua countdown setiap 1 detik.
 * Juga cek apakah ada countdown yang baru saja expired → trigger notifikasi.
 */
function startCountdownTimer() {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const countdownEls = document.querySelectorAll('.countdown-value[data-deadline]');
    
    countdownEls.forEach((el) => {
      const deadline = el.dataset.deadline;
      if (!deadline) return;

      const now = Date.now();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        // Countdown expired!
        if (el.innerHTML !== '<span class="countdown-ready">READY ✓</span>') {
          el.innerHTML = '<span class="countdown-ready">READY ✓</span>';

          // Cari nama akun untuk notifikasi
          const card = el.closest('.account-card');
          const accountId = card?.dataset.accountId;

          if (accountId && !notifiedIds.has(accountId)) {
            notifiedIds.add(accountId);
            const nameEl = card.querySelector('.card-name');
            const accountName = nameEl?.textContent?.trim() || 'Unknown';

            // Kirim browser notification + toast
            sendNotification(accountName);
            showToast(`🟢 "${accountName}" is ready! Quota has been refreshed.`, 'success');
          }
        }
        return;
      }

      // Hitung countdown
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      const parts = [];
      if (days > 0) parts.push(`<span class="cd-num">${days}</span><span class="cd-unit">d</span>`);
      if (hours > 0 || days > 0) parts.push(`<span class="cd-num">${String(hours).padStart(2, '0')}</span><span class="cd-unit">h</span>`);
      parts.push(`<span class="cd-num">${String(minutes).padStart(2, '0')}</span><span class="cd-unit">m</span>`);
      parts.push(`<span class="cd-num">${String(seconds).padStart(2, '0')}</span><span class="cd-unit">s</span>`);

      el.innerHTML = parts.join(' ');
    });
  }, 1000);
}

/**
 * Handle klik pada tombol di dalam card akun.
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
  accountForm.reset();
  inputId.value = '';

  if (editId) {
    const accounts = getAccounts();
    const account = accounts.find((a) => a.id === editId);
    if (!account) return;

    modalTitle.textContent = '// edit_account';
    inputName.value = account.name;
    inputStatus.value = account.status;
    inputDays.value = account.refreshDays ?? '';
    inputHours.value = account.refreshHours ?? '';
    inputId.value = account.id;
  } else {
    modalTitle.textContent = '// new_account';
  }

  modalOverlay.classList.remove('hidden');
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
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = inputName.value.trim();
  const status = inputStatus.value;
  const refreshDays = inputDays.value !== '' ? parseInt(inputDays.value, 10) : null;
  const refreshHours = inputHours.value !== '' ? parseInt(inputHours.value, 10) : null;
  const id = inputId.value;

  if (!name) return;

  closeModal();

  if (id) {
    // Edit — juga clear notified state karena timer mungkin di-reset
    notifiedIds.delete(id);
    await editAccount(id, { name, status, refreshDays, refreshHours });
  } else {
    await addAccount({ name, status, refreshDays, refreshHours });
  }
}

/**
 * Buka confirm dialog untuk delete.
 */
function openConfirm(id) {
  pendingDeleteId = id;

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
async function handleConfirmDelete() {
  if (pendingDeleteId) {
    notifiedIds.delete(pendingDeleteId);
    await removeAccount(pendingDeleteId);
  }
  closeConfirm();
}

/**
 * Legacy format durasi untuk akun yang belum punya deadline.
 * Fallback: jika refresh_deadline belum ada di database,
 * tampilkan static "Xd Xh" dari refresh_days/refresh_hours.
 * 
 * @param {number|null} days
 * @param {number|null} hours
 * @returns {string}
 */
function formatDurationLegacy(days, hours) {
  const d = days ?? 0;
  const h = hours ?? 0;
  if (d === 0 && h === 0 && days === null && hours === null) return '--';
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || parts.length === 0) parts.push(`${h}h`);
  return parts.join(' ');
}

/**
 * Escape HTML untuk mencegah XSS.
 * 
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
