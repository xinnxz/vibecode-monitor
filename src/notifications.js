/**
 * notifications.js — Notification Center Module
 * 
 * Menangani:
 * 1. Browser Notification API (native OS notification)
 * 2. In-app notification center (bell icon + dropdown panel)
 * 
 * Notification center menyimpan riwayat semua notifikasi akun yang ready.
 * User bisa klik bell icon untuk melihat dan clear notifications.
 */

// Daftar notifikasi yang tersimpan
let notifications = [];

// DOM refs
let badgeEl = null;
let notifListEl = null;
let notifPanelEl = null;

/**
 * Inisialisasi notification center.
 * Setup event listeners untuk bell icon dan clear button.
 */
export function initNotifications() {
  badgeEl = document.getElementById('notif-badge');
  notifListEl = document.getElementById('notif-list');
  notifPanelEl = document.getElementById('notif-panel');

  // Toggle notification panel saat bell di-klik
  const bellBtn = document.getElementById('btn-notifications');
  if (bellBtn) {
    bellBtn.addEventListener('click', toggleNotifPanel);
  }

  // Clear all notifications
  const clearBtn = document.getElementById('btn-clear-notifs');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearNotifications);
  }
}

/**
 * Minta izin untuk mengirim browser notification.
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    console.warn('⚠️ Browser tidak mendukung Notification API');
    return;
  }
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

/**
 * Kirim browser notification (native OS notification).
 * 
 * @param {string} accountName - Nama akun yang sudah ready
 */
export function sendNotification(accountName) {
  // 1. Tambahkan ke notification center
  addNotification(accountName);

  // 2. Kirim native OS notification (jika diizinkan)
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🟢 Account Ready', {
      body: `"${accountName}" quota has been refreshed!`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🟢</text></svg>',
      tag: `account-ready-${accountName}`,
    });
  }
}

/**
 * Tambah notifikasi ke notification center.
 * Update badge count dan render ulang list.
 * 
 * @param {string} accountName
 */
function addNotification(accountName) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const dateStr = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  notifications.unshift({
    id: Date.now(),
    name: accountName,
    time: `${dateStr} ${timeStr}`,
    read: false,
  });

  updateBadge();
  renderNotifList();
}

/**
 * Toggle visibility notification panel.
 */
function toggleNotifPanel() {
  if (!notifPanelEl) return;
  
  const isHidden = notifPanelEl.classList.contains('hidden');
  notifPanelEl.classList.toggle('hidden');

  // Saat panel dibuka, mark semua sebagai read
  if (isHidden) {
    notifications.forEach((n) => { n.read = true; });
    updateBadge();
  }
}

/**
 * Clear semua notifikasi.
 */
function clearNotifications() {
  notifications = [];
  updateBadge();
  renderNotifList();
}

/**
 * Update badge count di bell icon.
 * Hitung jumlah notifikasi yang belum dibaca (read === false).
 */
function updateBadge() {
  if (!badgeEl) return;
  
  const unread = notifications.filter((n) => !n.read).length;
  
  if (unread > 0) {
    badgeEl.textContent = unread > 9 ? '9+' : unread;
    badgeEl.classList.remove('hidden');
  } else {
    badgeEl.classList.add('hidden');
  }
}

/**
 * Render daftar notifikasi ke dropdown panel.
 */
function renderNotifList() {
  if (!notifListEl) return;

  if (notifications.length === 0) {
    notifListEl.innerHTML = '<p class="notif-empty">// no notifications</p>';
    return;
  }

  notifListEl.innerHTML = notifications
    .map((n) => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <span class="notif-dot">●</span>
        <div class="notif-content">
          <span class="notif-name">${n.name}</span>
          <span class="notif-msg">quota refreshed — ready to use</span>
        </div>
        <span class="notif-time">${n.time}</span>
      </div>
    `)
    .join('');
}
