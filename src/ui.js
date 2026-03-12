/**
 * ui.js — UI Module
 * 
 * Mengatur semua interaksi DOM:
 * 1. Render daftar akun ke panel sidebar
 * 2. Render stats bar (total/available/limited)
 * 3. Handle modal form (add/edit akun)
 * 4. Handle confirm dialog (delete akun)
 * 5. Filter akun (All / Active / Limited)
 * 6. Live countdown timer (update via requestAnimationFrame)
 * 7. Notifikasi saat akun ready
 * 8. Drag-to-reorder cards
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

import { sendNotification } from './notifications.js';
import { addLog } from './activity-log.js';
import { getHistory } from './history.js';
import { getWebhookConfig, saveWebhookConfig, sendWebhookNotification } from './webhook.js';
import { playClick, playConfirm, playDelete, playAlert } from './sounds.js';
import { PROVIDERS, getProvider } from './providers.js';

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
  inputMinutes,
  inputId,
  searchInput,
  sortSelect,
  inputTags,
  inputNotes,
  btnSelectMode,
  bulkActionBar,
  chkSelectAll,
  bulkCount,
  btnBulkAvailable,
  btnBulkLimited,
  btnBulkDelete,
  historyModalOverlay,
  btnHistoryClose,
  historyList,
  settingsModalOverlay,
  btnSettingsOpen,
  btnSettingsClose,
  btnSettingsCancel,
  settingsForm,
  inputDiscordUrl,
  inputTelegramToken,
  inputTelegramChatId,
  providerChipsContainer,
  filterProviderEl;

// State untuk Bulk Actions
let isSelectMode = false;
const selectedAccounts = new Set();

// Fungsi callback untuk update globe visuals
let onDataChange = null;

// ID akun yang sedang pending delete (untuk confirm dialog)
let pendingDeleteId = null;

// Filter state: 'all' | 'available' | 'limited'
let currentFilter = 'all';

// Search state
let searchTerm = '';
let searchDebounceTimer = null;

// Sort state: 'default' | 'name-asc' | 'name-desc' | 'time-asc' | 'status'
let currentSort = 'default';

// Provider filter state
let currentProviderFilter = 'all';

// Selected providers in modal (Set of provider IDs)
const selectedProviders = new Set();

// Set untuk track akun yang sudah pernah di-notify (cegah duplikat)
const notifiedIds = new Set();

// RAF ID untuk countdown timer
let countdownRAF = null;
let lastCountdownUpdate = 0;

// Drag state (managed by drag functions below)

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
  inputMinutes = document.getElementById('input-minutes');
  inputId = document.getElementById('input-id');
  searchInput = document.getElementById('search-input');
  sortSelect = document.getElementById('sort-select');
  inputTags = document.getElementById('input-tags');
  inputNotes = document.getElementById('input-notes');
  btnSelectMode = document.getElementById('btn-select-mode');
  bulkActionBar = document.getElementById('bulk-action-bar');
  chkSelectAll = document.getElementById('chk-select-all');
  bulkCount = document.getElementById('bulk-count');
  btnBulkAvailable = document.getElementById('btn-bulk-available');
  btnBulkLimited = document.getElementById('btn-bulk-limited');
  btnBulkDelete = document.getElementById('btn-bulk-delete');
  historyModalOverlay = document.getElementById('history-modal-overlay');
  btnHistoryClose = document.getElementById('btn-history-close');
  historyList = document.getElementById('history-list');
  settingsModalOverlay = document.getElementById('settings-modal-overlay');
  btnSettingsOpen = document.getElementById('btn-settings-open');
  btnSettingsClose = document.getElementById('btn-settings-close');
  btnSettingsCancel = document.getElementById('btn-settings-cancel');
  settingsForm = document.getElementById('settings-form');
  inputDiscordUrl = document.getElementById('input-discord-url');
  inputTelegramToken = document.getElementById('input-telegram-token');
  inputTelegramChatId = document.getElementById('input-telegram-chatid');
  providerChipsContainer = document.getElementById('provider-chips');
  filterProviderEl = document.getElementById('filter-provider');

  // Populate provider dropdowns and chips from registry
  populateProviderDropdowns();
  populateProviderChips();

  // Filter by provider
  if (filterProviderEl) {
    filterProviderEl.addEventListener('change', () => {
      currentProviderFilter = filterProviderEl.value;
      renderAccountList(getAccounts());
    });
  }

  // Fix scroll: Isolasi scroll panel dari Three.js OrbitControls.
  // OrbitControls memasang wheel listener di renderer.domElement;
  // kita stop propagation agar wheel di panel tidak bocor ke canvas.
  // Harus non-passive agar bisa preventDefault jika diperlukan.
  const sidePanel = document.getElementById('side-panel');
  sidePanel.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: true });

  // Juga block pointer events saat di atas panel agar tidak mempengaruhi globe
  sidePanel.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  sidePanel.addEventListener('pointermove', (e) => {
    e.stopPropagation();
  });

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
      else if (!confirmOverlay.classList.contains('hidden')) closeConfirm();
      else if (historyModalOverlay && !historyModalOverlay.classList.contains('hidden')) closeHistoryModal();
      else if (settingsModalOverlay && !settingsModalOverlay.classList.contains('hidden')) closeSettingsModal();
      else if (isSelectMode) toggleSelectMode();
    }
  });

  // History modal bindings
  if (btnHistoryClose) {
    btnHistoryClose.addEventListener('click', closeHistoryModal);
  }
  if (historyModalOverlay) {
    historyModalOverlay.addEventListener('click', (e) => {
      if (e.target === historyModalOverlay) closeHistoryModal();
    });
  }

  // Settings modal bindings
  if (btnSettingsOpen) btnSettingsOpen.addEventListener('click', openSettingsModal);
  if (btnSettingsClose) btnSettingsClose.addEventListener('click', closeSettingsModal);
  if (btnSettingsCancel) btnSettingsCancel.addEventListener('click', closeSettingsModal);
  if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSubmit);
  if (settingsModalOverlay) {
    settingsModalOverlay.addEventListener('click', (e) => {
      if (e.target === settingsModalOverlay) closeSettingsModal();
    });
  }

  // --- Bulk Actions ---
  if (btnSelectMode) btnSelectMode.addEventListener('click', toggleSelectMode);
  if (chkSelectAll) chkSelectAll.addEventListener('change', handleSelectAll);
  if (btnBulkAvailable) btnBulkAvailable.addEventListener('click', () => handleBulkAction('available'));
  if (btnBulkLimited) btnBulkLimited.addEventListener('click', () => handleBulkAction('limited'));
  if (btnBulkDelete) btnBulkDelete.addEventListener('click', () => handleBulkAction('delete'));

  // --- Filter Buttons ---
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderAccountList(getAccounts());
    });
  });

  // --- Search (debounced 200ms) ---
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchTerm = searchInput.value.trim().toLowerCase();
        renderAccountList(getAccounts());
      }, 200);
    });
  }

  // --- Sort ---
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      renderAccountList(getAccounts());
    });
  }

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

  // Start countdown timer via RAF (lebih smooth dari setInterval)
  startCountdownRAF();
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
 * Render daftar akun ke sidebar panel, dengan filter + search + sort applied.
 * 
 * Pipeline: accounts → filter by status → filter by search → sort → render
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

  // 1. Filter by status
  let result = currentFilter === 'all'
    ? [...accounts]
    : accounts.filter((a) => a.status === currentFilter);

  // 2. Filter by search term
  if (searchTerm) {
    result = result.filter((a) => a.name.toLowerCase().includes(searchTerm));
  }

  // 3. Filter by provider
  if (currentProviderFilter !== 'all') {
    result = result.filter((a) => {
      const provArr = Array.isArray(a.provider) ? a.provider : (a.provider ? [a.provider] : []);
      return provArr.includes(currentProviderFilter);
    });
  }

  // 4. Sort
  result = sortAccounts(result, currentSort);

  if (result.length === 0) {
    const context = searchTerm ? `matching "${searchTerm}"` : currentFilter;
    accountListEl.innerHTML = `
      <div class="empty-state">
        <p style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">// no accounts found ${context}</p>
      </div>
    `;
    return;
  }

  accountListEl.innerHTML = result
    .map(
      (account, index) => {
        const isAvailable = account.status === 'available';
        const statusLabel = isAvailable ? 'ONLINE' : 'BLOCKED';
        const statusTextClass = isAvailable ? 'available' : 'limited';
        const shortId = account.id.replace(/-/g, '').slice(0, 12).toUpperCase();
        const countdownHtml = renderCountdown(account);

        // Provider badges (multiple)
        const providerArr = Array.isArray(account.provider) ? account.provider : (account.provider ? [account.provider] : []);
        const provBadgesHtml = providerArr.length > 0
          ? providerArr.map(pid => {
              const prov = getProvider(pid);
              return `<div class="provider-badge" style="--prov-color: ${prov.color}">
                <span class="provider-icon">${prov.svgIcon}</span>
                <span>${prov.name}</span>
              </div>`;
            }).join('')
          : '';

        const tagsHtml = (account.tags && account.tags.length > 0)
          ? `<div class="card-tags">${account.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('')}</div>`
          : '';

        const notesHtml = account.notes
          ? `<div class="card-notes" title="Notes">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
               </svg>
               <span class="note-text">${escapeHtml(account.notes)}</span>
             </div>`
          : '';

        return `
    <div class="account-card status-${account.status} ${selectedAccounts.has(account.id) ? 'selected' : ''}" 
         style="animation-delay: ${index * 0.08}s" 
         data-account-id="${account.id}">
      <!-- Checkbox for Select Mode -->
      <div class="card-checkbox-wrapper ${isSelectMode ? '' : 'hidden'}">
        <input type="checkbox" class="hacker-checkbox card-checkbox" value="${account.id}" ${selectedAccounts.has(account.id) ? 'checked' : ''} />
      </div>
      <!-- Terminal-style header bar (drag handle) -->
      <div class="card-header-bar card-drag-handle">
        <div class="card-header-left">
          <span class="card-status-indicator"></span>
          <span>${statusLabel}</span>
        </div>
        <div class="card-header-actions">
          <button class="btn-icon copy" title="Copy Credentials" data-action="copy" data-id="${account.id}" data-name="${escapeHtml(account.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-tooltip">Copied!</span>
          </button>
          <button class="btn-icon history" title="History Log" data-action="history" data-id="${account.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
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
        <div class="provider-badges-row">${provBadgesHtml}</div>
        <div class="card-name">
          <span class="card-name-prefix">&gt;</span>
          ${escapeHtml(account.name)}
        </div>
        ${tagsHtml}
        ${notesHtml}
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

  // Event delegation untuk button actions & checkboxes
  // Hapus listener lama, tambah baru (avoid stacking)
  accountListEl.removeEventListener('click', handleCardAction);
  accountListEl.addEventListener('click', handleCardAction);
  accountListEl.removeEventListener('change', handleCardCheckbox);
  accountListEl.addEventListener('change', handleCardCheckbox);

  // Setup drag-to-reorder (custom pointer-based)
  // Disable drag if in select mode
  if (!isSelectMode) {
    setupDragAndDrop();
  }
}

// ============================================================
// BULK ACTIONS LOGIC
// ============================================================

function toggleSelectMode() {
  isSelectMode = !isSelectMode;
  selectedAccounts.clear();
  
  if (isSelectMode) {
    accountListEl.classList.add('select-mode-active');
    bulkActionBar.classList.remove('hidden');
    btnSelectMode.style.color = 'var(--accent-cyan)';
    playClick();
  } else {
    accountListEl.classList.remove('select-mode-active');
    bulkActionBar.classList.add('hidden');
    btnSelectMode.style.color = '';
    playClick();
  }
  
  updateBulkUI();
  renderAccountList(getAccounts()); // Re-render to show/hide checkboxes
}

function handleCardCheckbox(e) {
  if (e.target.classList.contains('card-checkbox')) {
    const id = e.target.value;
    if (e.target.checked) {
      selectedAccounts.add(id);
    } else {
      selectedAccounts.delete(id);
    }
    updateBulkUI();
    playClick();
  }
}

function handleSelectAll(e) {
  const isChecked = e.target.checked;
  // Let's only select/deselect the currently visible accounts
  const visibleCards = accountListEl.querySelectorAll('.account-card');
  
  visibleCards.forEach(card => {
    const id = card.dataset.accountId;
    if (isChecked) {
      selectedAccounts.add(id);
    } else {
      selectedAccounts.delete(id);
    }
  });
  
  updateBulkUI();
  playClick();
  
  // Need to update actual checkboxes in DOM
  const checkboxes = accountListEl.querySelectorAll('.card-checkbox');
  checkboxes.forEach(cb => cb.checked = isChecked);
}

function updateBulkUI() {
  if (bulkCount) bulkCount.textContent = `${selectedAccounts.size} selected`;
  if (chkSelectAll) {
    // Check if all visible are selected
    const visibleCards = accountListEl.querySelectorAll('.account-card').length;
    chkSelectAll.checked = visibleCards > 0 && selectedAccounts.size === visibleCards;
  }
}

async function handleBulkAction(action) {
  if (selectedAccounts.size === 0) return;
  
  const ids = Array.from(selectedAccounts);
  const count = ids.length;
  
  try {
    if (action === 'available' || action === 'limited') {
      // Parallel update
      await Promise.all(ids.map(id => editAccount(id, { status: action })));
      addLog('SYSTEM', `Bulk updated ${count} accounts to ${action}`);
      playConfirm();
    } else if (action === 'delete') {
      if (!confirm(`Are you sure you want to terminate ${count} selected accounts?`)) return;
      // Parallel delete
      await Promise.all(ids.map(id => {
        notifiedIds.delete(id);
        return removeAccount(id);
      }));
      addLog('SYSTEM', `Bulk deleted ${count} accounts`);
      playDelete();
    }
  } catch (err) {
    console.error('Bulk action error:', err);
    addLog('SYSTEM', `Bulk action failed`);
  }
  
  // Exit select mode
  toggleSelectMode();
}

// ============================================================
// DRAG & DROP — Custom Pointer-based Reorder
// ============================================================

/**
 * State untuk drag system.
 * 
 * Kenapa custom dan bukan HTML5 Drag API?
 * HTML5 Drag API menghasilkan "ghost image" yang kaku dan tidak bisa
 * di-style. Dengan custom pointer events, kita bisa:
 * - Membuat card "terangkat" dan mengikuti cursor dengan smooth
 * - Menggeser card lain dengan animasi transition
 * - Full kontrol atas semua visual feedback
 */
let isDragging = false;
let dragClone = null;          // Floating clone yang mengikuti cursor
let dragSourceCard = null;     // Card asli yang sedang di-drag
let dragStartY = 0;            // Posisi Y awal saat drag mulai
let dragOffsetY = 0;           // Offset antara cursor dan top card
let dragPlaceholderIdx = -1;   // Index target dimana card akan di-drop

/**
 * Setup drag event listeners pada account list.
 * Menggunakan event delegation — satu listener di parent.
 */
function setupDragAndDrop() {
  // Pasang di accountListEl (parent), bukan di setiap card
  accountListEl.addEventListener('pointerdown', onDragStart);
}

/**
 * Mulai drag saat user pointerdown pada card header.
 * 
 * Hanya mulai drag dari .card-drag-handle (header bar card).
 * Ini mencegah drag saat klik tombol edit/delete.
 */
function onDragStart(e) {
  // Hanya left-click / primary touch
  if (e.button !== 0) return;

  // Jangan drag jika klik pada button (edit/delete)  
  if (e.target.closest('[data-action]')) return;

  // Cari card dan pastikan klik di area drag handle
  const card = e.target.closest('.account-card');
  if (!card) return;

  const handle = e.target.closest('.card-drag-handle');
  if (!handle) return;

  // Prevent text selection saat drag
  e.preventDefault();

  isDragging = true;
  dragSourceCard = card;

  const rect = card.getBoundingClientRect();
  dragOffsetY = e.clientY - rect.top;
  dragStartY = e.clientY;

  // Buat floating clone
  dragClone = card.cloneNode(true);
  dragClone.classList.add('drag-clone');
  dragClone.style.width = `${rect.width}px`;
  dragClone.style.left = `${rect.left}px`;
  dragClone.style.top = `${rect.top}px`;
  document.body.appendChild(dragClone);

  // Sembunyikan card asli (beri placeholder space)
  card.classList.add('drag-source');

  // Hitung posisi awal semua cards untuk animasi gap
  cacheCardPositions();

  // Pasang move dan up listener di document (agar track di luar element)
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd);
}

/**
 * Cache posisi Y setiap card untuk kalkulasi gap.
 */
let cardRects = [];

function cacheCardPositions() {
  const cards = Array.from(accountListEl.querySelectorAll('.account-card'));
  cardRects = cards.map((card) => ({
    el: card,
    top: card.getBoundingClientRect().top,
    height: card.getBoundingClientRect().height,
    id: card.dataset.accountId,
  }));
}

/**
 * Handle pointer move saat dragging.
 * - Update posisi floating clone
 * - Hitung target index berdasarkan posisi cursor
 * - Animasi cards lain untuk membuat gap
 */
function onDragMove(e) {
  if (!isDragging || !dragClone) return;

  // Update posisi clone (mengikuti cursor)
  const newTop = e.clientY - dragOffsetY;
  dragClone.style.top = `${newTop}px`;

  // Hitung index target: di posisi mana card akan jatuh
  const cursorY = e.clientY;
  const cards = Array.from(accountListEl.querySelectorAll('.account-card'));
  const sourceIdx = cards.indexOf(dragSourceCard);
  let targetIdx = sourceIdx;

  for (let i = 0; i < cards.length; i++) {
    if (cards[i] === dragSourceCard) continue;
    const rect = cards[i].getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (cursorY > midY) {
      targetIdx = i > sourceIdx ? i : i + 1;
    } else if (i < sourceIdx && cursorY < midY) {
      targetIdx = i;
      break;
    }
  }

  // Hanya update jika target berubah (hindari repaint berlebihan)
  if (targetIdx !== dragPlaceholderIdx) {
    dragPlaceholderIdx = targetIdx;
    animateGap(cards, sourceIdx, targetIdx);
  }
}

/**
 * Animasi card-card lain untuk "membuka ruang" di posisi target.
 * 
 * Cara kerja:
 * - Cards antara source dan target bergeser ke atas/bawah
 * - Menggunakan CSS transform translateY dengan transition
 * - Ini memberikan efek visual bahwa card lain "menyingkir"
 * 
 * @param {Element[]} cards - Semua card elements
 * @param {number} fromIdx - Index card yang sedang di-drag
 * @param {number} toIdx - Index target dimana card akan di-drop
 */
function animateGap(cards, fromIdx, toIdx) {
  const sourceHeight = dragSourceCard.offsetHeight + 12; // +12 for margin

  cards.forEach((card, i) => {
    if (card === dragSourceCard) return;

    let shift = 0;

    if (fromIdx < toIdx) {
      // Drag ke bawah: cards di antara from+1 dan to geser ke atas
      if (i > fromIdx && i <= toIdx) {
        shift = -sourceHeight;
      }
    } else if (fromIdx > toIdx) {
      // Drag ke atas: cards di antara to dan from-1 geser ke bawah
      if (i >= toIdx && i < fromIdx) {
        shift = sourceHeight;
      }
    }

    card.style.transform = shift ? `translateY(${shift}px)` : '';
  });
}

/**
 * Selesaikan drag — drop card di posisi target.
 * 
 * Langkah:
 * 1. Hitung posisi final card di DOM
 * 2. Animasi clone ke posisi akhir (smooth landing)
 * 3. Pindahkan card asli di DOM
 * 4. Cleanup semua state dan styles
 */
function onDragEnd() {
  if (!isDragging) return;

  // Hapus move/up listeners
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', onDragEnd);

  const cards = Array.from(accountListEl.querySelectorAll('.account-card'));
  const fromIdx = cards.indexOf(dragSourceCard);
  const toIdx = dragPlaceholderIdx;

  // Reset transform semua cards
  cards.forEach((card) => {
    card.style.transition = 'none';
    card.style.transform = '';
  });

  // Pindahkan di DOM jika index berubah
  if (toIdx !== -1 && toIdx !== fromIdx) {
    const targetCard = cards[toIdx];
    if (toIdx > fromIdx) {
      accountListEl.insertBefore(dragSourceCard, targetCard?.nextSibling || null);
    } else {
      accountListEl.insertBefore(dragSourceCard, targetCard);
    }
  }

  // Cleanup
  dragSourceCard.classList.remove('drag-source');

  // Animasi landing: clone menghilang
  if (dragClone) {
    const finalRect = dragSourceCard.getBoundingClientRect();
    dragClone.style.transition = 'all 0.2s cubic-bezier(0.2, 0, 0, 1)';
    dragClone.style.top = `${finalRect.top}px`;
    dragClone.style.left = `${finalRect.left}px`;
    dragClone.style.transform = 'scale(1)';
    dragClone.style.boxShadow = 'none';

    setTimeout(() => {
      dragClone?.remove();
      dragClone = null;
    }, 200);
  }

  // Re-enable transition untuk card lain
  requestAnimationFrame(() => {
    cards.forEach((card) => {
      card.style.transition = '';
    });
  });

  // Reset drag state
  isDragging = false;
  dragSourceCard = null;
  dragPlaceholderIdx = -1;
  dragStartY = 0;
  cardRects = [];
}

// ============================================================
// SORT LOGIC
// ============================================================

/**
 * Sort akun berdasarkan mode yang dipilih.
 * 
 * Modes:
 * - 'default': urutan dari database (created_at)
 * - 'name-asc': nama A → Z
 * - 'name-desc': nama Z → A
 * - 'time-asc': soonest ready (deadline paling dekat di atas)
 * - 'status': available/active first, limited di bawah
 * 
 * @param {Array} accounts
 * @param {string} mode
 * @returns {Array} Sorted copy
 */
function sortAccounts(accounts, mode) {
  if (mode === 'default') return accounts;

  const sorted = [...accounts];

  switch (mode) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'time-asc':
      // Akun dengan deadline paling dekat di atas.
      // Akun tanpa deadline = di bawah (Infinity).
      sorted.sort((a, b) => {
        const aTime = a.refreshDeadline ? new Date(a.refreshDeadline).getTime() : Infinity;
        const bTime = b.refreshDeadline ? new Date(b.refreshDeadline).getTime() : Infinity;
        return aTime - bTime;
      });
      break;
    case 'status':
      // Available/active first
      sorted.sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === 'available' ? -1 : 1;
      });
      break;
  }

  return sorted;
}

// ============================================================
// COUNTDOWN TIMER (via requestAnimationFrame)
// ============================================================

/**
 * Render countdown string dari deadline.
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

  return formatCountdown(diff);
}

/**
 * Format milliseconds diff ke countdown string.
 * @param {number} diff - Selisih ms
 * @returns {string} HTML
 */
function formatCountdown(diff) {
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
 * Start countdown update loop via requestAnimationFrame.
 * Lebih efisien dari setInterval karena:
 * - Otomatis pause saat tab tidak visible
 * - Synced dengan browser repaint cycle
 * - Hanya update setiap 1 detik (throttled)
 */
function startCountdownRAF() {
  function tick(timestamp) {
    // Throttle: hanya update setiap ~1000ms
    if (timestamp - lastCountdownUpdate >= 1000) {
      lastCountdownUpdate = timestamp;
      updateCountdowns();
    }
    countdownRAF = requestAnimationFrame(tick);
  }
  countdownRAF = requestAnimationFrame(tick);
}

/**
 * Update semua countdown displays di DOM.
 * Menggunakan textContent/innerHTML minimal untuk mengurangi reflow.
 */
function updateCountdowns() {
  const countdownEls = document.querySelectorAll('.countdown-value[data-deadline]');

  countdownEls.forEach((el) => {
    const deadline = el.dataset.deadline;
    if (!deadline) return;

    const now = Date.now();
    const target = new Date(deadline).getTime();
    const diff = target - now;

    if (diff <= 0) {
      // Countdown expired!
      const readyHtml = '<span class="countdown-ready">READY ✓</span>';
      if (el.innerHTML !== readyHtml) {
        el.innerHTML = readyHtml;

        // Trigger notifikasi + auto-status toggle
        const card = el.closest('.account-card');
        const accountId = card?.dataset.accountId;

        if (accountId && !notifiedIds.has(accountId)) {
          notifiedIds.add(accountId);
          const nameEl = card.querySelector('.card-name');
          const accountName = nameEl?.textContent?.trim() || 'Unknown';

          // Kirim notification (browser + notification center)
          sendNotification(accountName);
          // Kirim webhook
          sendWebhookNotification(accountName);
          
          addLog('TIMER_EXPIRED', `"${accountName}" → READY`);
          playAlert();

          // AUTO-STATUS TOGGLE:
          // Jika akun masih "limited", otomatis ubah ke "available"
          const accounts = getAccounts();
          const account = accounts.find((a) => a.id === accountId);
          if (account && account.status === 'limited') {
            // Jalankan update secara asinkron tanpa nge-block render frame UI
            (async () => {
              try {
                await editAccount(accountId, { status: 'available' });
                addLog('STATUS_CHANGED', `"${accountName}" limited → available (auto)`);
              } catch (err) {
                console.error("Auto-status update failed:", err);
              }
            })();
          }
        }
      }
      return;
    }

    // Update countdown display
    el.innerHTML = formatCountdown(diff);
  });
}

// ============================================================
// CARD ACTIONS, MODAL, CONFIRM
// ============================================================

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
  } else if (action === 'history') {
    openHistoryModal(id);
  } else if (action === 'copy') {
    const name = btn.dataset.name;
    copyToClipboard(name, btn);
  }
}

/**
 * Copy text ke clipboard dan tampilkan animasi "Copied!"
 */
async function copyToClipboard(text, btnElement) {
  try {
    await navigator.clipboard.writeText(text);
    
    // Tampilkan tooltip
    const tooltip = btnElement.querySelector('.copy-tooltip');
    if (tooltip) {
      tooltip.classList.add('show');
      setTimeout(() => {
        tooltip.classList.remove('show');
      }, 1500);
    }
    
    playClick(); // Mainkan sound effect kecil
  } catch (err) {
    console.error('Failed to copy tekst:', err);
    addLog('SYSTEM', 'Copy to clipboard failed');
  }
}

/**
 * Populate provider dropdowns dari registry.
 */
function populateProviderDropdowns() {
  // Filter dropdown (prepend "All")
  if (filterProviderEl) {
    filterProviderEl.innerHTML = '<option value="all">All Providers</option>' +
      PROVIDERS.filter(p => p.id !== 'other').map(p =>
        `<option value="${p.id}">${p.name}</option>`
      ).join('') +
      '<option value="other">Other</option>';
  }
}

/**
 * Buat clickable provider chips di modal form.
 * Setiap chip bisa di-toggle on/off (multi-select).
 * Saat di-klik, otomatis auto-fill timer ke default provider tersebut.
 */
function populateProviderChips() {
  if (!providerChipsContainer) return;

  providerChipsContainer.innerHTML = PROVIDERS.filter(p => p.id !== 'other').map(p =>
    `<button type="button" class="provider-chip" data-provider="${p.id}" style="--prov-color: ${p.color}">
      <span class="provider-icon">${p.svgIcon}</span>
      <span>${p.name}</span>
    </button>`
  ).join('');

  // Event delegation untuk toggle chips
  providerChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.provider-chip');
    if (!chip) return;

    const pid = chip.dataset.provider;
    if (selectedProviders.has(pid)) {
      selectedProviders.delete(pid);
      chip.classList.remove('active');
    } else {
      selectedProviders.add(pid);
      chip.classList.add('active');

      // Auto-fill timer to this provider's default
      const p = getProvider(pid);
      if (p && p.defaultHours > 0) {
        const days = Math.floor(p.defaultHours / 24);
        const hours = p.defaultHours % 24;
        inputDays.value = days > 0 ? days : '';
        inputHours.value = hours > 0 ? hours : (days > 0 ? '0' : '');
        inputMinutes.value = '';
      }
    }

    playClick();
  });
}

/**
 * Buka modal form.
 */
function openModal(editId = null) {
  accountForm.reset();
  inputId.value = '';
  selectedProviders.clear();

  // Reset all chips to inactive
  if (providerChipsContainer) {
    providerChipsContainer.querySelectorAll('.provider-chip').forEach(c => c.classList.remove('active'));
  }

  if (editId) {
    const accounts = getAccounts();
    const account = accounts.find((a) => a.id === editId);
    if (!account) return;

    modalTitle.textContent = '// edit_account';
    inputName.value = account.name;

    // Restore selected providers
    const provArr = Array.isArray(account.provider) ? account.provider : (account.provider ? [account.provider] : []);
    provArr.forEach(pid => {
      selectedProviders.add(pid);
      const chip = providerChipsContainer?.querySelector(`[data-provider="${pid}"]`);
      if (chip) chip.classList.add('active');
    });

    inputStatus.value = account.status;
    inputDays.value = account.refreshDays ?? '';
    inputHours.value = account.refreshHours ?? '';
    inputMinutes.value = account.refreshMinutes ?? '';
    inputTags.value = account.tags ? account.tags.join(', ') : '';
    inputNotes.value = account.notes ?? '';
    inputId.value = account.id;
  } else {
    modalTitle.textContent = '// new_account';
  }

  modalOverlay.classList.remove('hidden');
  setTimeout(() => inputName.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  accountForm.reset();
  selectedProviders.clear();
  if (providerChipsContainer) {
    providerChipsContainer.querySelectorAll('.provider-chip').forEach(c => c.classList.remove('active'));
  }
  if (inputTags) inputTags.value = '';
  if (inputNotes) inputNotes.value = '';
}

/**
 * Handle submit form (Add atau Edit).
 * Sekarang include minutes.
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = inputName.value.trim();
  const status = inputStatus.value;
  const provider = Array.from(selectedProviders);
  const refreshDays = inputDays.value !== '' ? parseInt(inputDays.value, 10) : null;
  const refreshHours = inputHours.value !== '' ? parseInt(inputHours.value, 10) : null;
  const refreshMinutes = inputMinutes.value !== '' ? parseInt(inputMinutes.value, 10) : null;
  const tagsRaw = inputTags.value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const notes = inputNotes.value.trim();
  const id = inputId.value;

  if (!name) return;

  const provLabel = provider.length > 0 ? provider.join(', ') : 'none';

  closeModal();

  if (id) {
    notifiedIds.delete(id);
    await editAccount(id, { name, status, provider, refreshDays, refreshHours, refreshMinutes, tags, notes });
    addLog('ACCOUNT_EDITED', `"${name}" updated (${provLabel} / ${status})`);
    playConfirm();
  } else {
    await addAccount({ name, status, provider, refreshDays, refreshHours, refreshMinutes, tags, notes });
    addLog('ACCOUNT_ADDED', `"${name}" registered (${provLabel} / ${status})`);
    playConfirm();
  }
}

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

function closeConfirm() {
  confirmOverlay.classList.add('hidden');
  pendingDeleteId = null;
}

async function handleConfirmDelete() {
  if (pendingDeleteId) {
    const accounts = getAccounts();
    const account = accounts.find((a) => a.id === pendingDeleteId);
    const deletedName = account?.name || 'unknown';
    notifiedIds.delete(pendingDeleteId);
    await removeAccount(pendingDeleteId);
    addLog('ACCOUNT_DELETED', `"${deletedName}" terminated`);
    playDelete();
  }
  closeConfirm();
}

async function openHistoryModal(id) {
  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) return;

  document.getElementById('history-modal-title').textContent = `// history: ${account.name}`;
  historyList.innerHTML = '<p class="notif-empty">// fetching data...</p>';
  historyModalOverlay.classList.remove('hidden');

  const history = await getHistory(id);
  
  if (!history || history.length === 0) {
    historyList.innerHTML = '<p class="notif-empty">// no history found</p>';
    return;
  }

  historyList.innerHTML = history.map(item => {
    // Assuming item.timestamp exists
    const dateOpts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const date = new Date(item.timestamp || item.created_at || Date.now()).toLocaleString(undefined, dateOpts);
    
    let detail = '';
    if (item.old_status && item.new_status) {
      detail = `<br/><span style="color:var(--text-muted)">${item.old_status}</span> ➔ <span style="color:var(--accent-cyan)">${item.new_status}</span>`;
    } else if (item.new_status) {
      detail = `<br/>➔ <span style="color:var(--accent-cyan)">${item.new_status}</span>`;
    }
    
    return `
      <div class="log-entry" style="margin-bottom:12px; font-family:'JetBrains Mono', monospace; font-size:11px;">
        <span class="log-time" style="color:var(--text-muted)">[${date}]</span>
        <span class="log-type" style="color:var(--accent-green); margin-left:8px;">${item.event}</span>
        ${detail}
      </div>
    `;
  }).join('');
}

function closeHistoryModal() {
  historyModalOverlay.classList.add('hidden');
}

// Settings Modal
function openSettingsModal() {
  const config = getWebhookConfig();
  if (inputDiscordUrl) inputDiscordUrl.value = config.discordUrl;
  if (inputTelegramToken) inputTelegramToken.value = config.telegramToken;
  if (inputTelegramChatId) inputTelegramChatId.value = config.telegramChatId;
  settingsModalOverlay.classList.remove('hidden');
}

function closeSettingsModal() {
  settingsModalOverlay.classList.add('hidden');
}

function handleSettingsSubmit(e) {
  e.preventDefault();
  const discordUrl = inputDiscordUrl ? inputDiscordUrl.value.trim() : '';
  const telegramToken = inputTelegramToken ? inputTelegramToken.value.trim() : '';
  const telegramChatId = inputTelegramChatId ? inputTelegramChatId.value.trim() : '';

  saveWebhookConfig({ discordUrl, telegramToken, telegramChatId });
  closeSettingsModal();
  addLog('SYSTEM', 'Webhook settings saved');
  playConfirm();
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Legacy format durasi untuk akun yang belum punya deadline.
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
