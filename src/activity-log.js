/**
 * activity-log.js — Terminal Activity Log Module
 * 
 * Mini terminal console yang menampilkan log aktivitas real-time.
 * Format: [HH:MM:SS] > EVENT_TYPE: detail
 * 
 * Fitur:
 * - FIFO buffer (max 50 entries, otomatis hapus yang lama)
 * - Auto-scroll ke entry terbaru
 * - Collapsible panel (toggle open/close)
 * - Warna berdasarkan event type
 */

// Max log entries (FIFO buffer)
const MAX_ENTRIES = 50;

// Log storage
let logs = [];

// DOM refs
let logListEl = null;
let logPanelEl = null;
let logBadgeEl = null;
let unreadCount = 0;

/**
 * Inisialisasi activity log.
 * Setup DOM refs dan event listeners.
 */
export function initActivityLog() {
  logPanelEl = document.getElementById('activity-log');
  logListEl = document.getElementById('log-list');
  logBadgeEl = document.getElementById('log-badge');

  // Toggle collapsible
  const toggleBtn = document.getElementById('btn-toggle-log');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      logPanelEl.classList.toggle('collapsed');
      
      // Clear unread count saat dibuka
      if (!logPanelEl.classList.contains('collapsed')) {
        unreadCount = 0;
        updateBadge();
      }
    });
  }

  // Initial log entry
  addLog('SYSTEM', 'boot sequence complete');
}

/**
 * Tambahkan entry ke activity log.
 * 
 * @param {string} type - Event type: 'SYSTEM', 'ACCOUNT_ADDED', 'ACCOUNT_EDITED', 
 *                        'ACCOUNT_DELETED', 'TIMER_EXPIRED', 'STATUS_CHANGED'
 * @param {string} message - Detail pesan
 */
export function addLog(type, message) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const entry = { time: timeStr, type, message };

  // FIFO: hapus entry terlama jika melebihi MAX
  logs.push(entry);
  if (logs.length > MAX_ENTRIES) {
    logs.shift();
  }

  // Update unread jika panel collapsed
  if (logPanelEl?.classList.contains('collapsed')) {
    unreadCount++;
    updateBadge();
  }

  renderLog();
}

/**
 * Render log entries ke DOM.
 */
function renderLog() {
  if (!logListEl) return;

  logListEl.innerHTML = logs
    .map((entry) => {
      const typeClass = getTypeClass(entry.type);
      return `<div class="log-entry"><span class="log-time">[${entry.time}]</span> <span class="log-prefix">></span> <span class="log-type ${typeClass}">${entry.type}:</span> <span class="log-msg">${entry.message}</span></div>`;
    })
    .join('');

  // Auto-scroll ke bawah
  logListEl.scrollTop = logListEl.scrollHeight;
}

/**
 * Update badge counter di toggle button.
 */
function updateBadge() {
  if (!logBadgeEl) return;

  if (unreadCount > 0) {
    logBadgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
    logBadgeEl.classList.remove('hidden');
  } else {
    logBadgeEl.classList.add('hidden');
  }
}

/**
 * Map event type ke CSS class untuk coloring.
 */
function getTypeClass(type) {
  switch (type) {
    case 'SYSTEM': return 'log-cyan';
    case 'ACCOUNT_ADDED': return 'log-green';
    case 'ACCOUNT_EDITED': return 'log-yellow';
    case 'ACCOUNT_DELETED': return 'log-red';
    case 'TIMER_EXPIRED': return 'log-green';
    case 'STATUS_CHANGED': return 'log-yellow';
    default: return 'log-cyan';
  }
}
