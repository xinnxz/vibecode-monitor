/**
 * notifications.js — Notification Module
 * 
 * Menangani:
 * 1. Browser Notification API (native OS notification)
 * 2. In-app toast popup (visual feedback di layar)
 * 
 * Browser notification memerlukan izin user.
 * Toast selalu bisa tampil tanpa izin.
 */

/**
 * Minta izin untuk mengirim browser notification.
 * 
 * Notification.requestPermission() return promise dengan value:
 * - "granted": user mengizinkan → notification bisa dikirim
 * - "denied": user menolak → notification diblokir
 * - "default": user belum memutuskan
 * 
 * Hanya perlu dipanggil sekali saat app init.
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
 * Notification hanya muncul jika:
 * 1. Browser mendukung Notification API
 * 2. User sudah memberikan izin (granted)
 * 
 * @param {string} accountName - Nama akun yang sudah ready
 */
export function sendNotification(accountName) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification('🟢 Account Ready', {
    body: `"${accountName}" quota has been refreshed and is ready to use!`,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🟢</text></svg>',
    tag: `account-ready-${accountName}`, // Prevent duplicate notifications
  });
}

/**
 * Tampilkan toast notification di dalam app.
 * 
 * Toast adalah popup kecil di kanan bawah layar yang otomatis
 * hilang setelah 5 detik. Berguna untuk feedback visual yang
 * tidak memerlukan interaksi user.
 * 
 * @param {string} message - Pesan yang ditampilkan
 * @param {'success'|'info'|'warning'} type - Tipe toast (mempengaruhi warna)
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ'}</div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  // Auto-remove setelah 5 detik (500ms untuk animasi fadeOut + 4500ms tampil)
  setTimeout(() => {
    toast.classList.add('toast-exit');
    // Hapus dari DOM setelah animasi exit selesai
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}
