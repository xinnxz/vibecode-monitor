/**
 * accounts.js — Account Data Management Module
 * 
 * Mengelola data akun Antigravity di localStorage.
 * Menyediakan CRUD operations dan event system untuk notify komponen lain.
 * 
 * Data Model per akun:
 * {
 *   id: string (UUID),
 *   name: string,
 *   status: "available" | "limited",
 *   refreshDays: number | null,     // sisa hari sampai refresh
 *   refreshHours: number | null,    // sisa jam sampai refresh
 *   createdAt: string (ISO datetime)
 * }
 */

const STORAGE_KEY = 'antigravity-accounts';

/** 
 * Listeners yang akan dipanggil setiap kali data berubah.
 * Pattern: Observer/Pub-Sub sederhana agar globe & UI bisa react ke perubahan data.
 */
const listeners = [];

/**
 * Generate UUID v4 sederhana.
 * Digunakan untuk memberikan ID unik ke setiap akun baru.
 */
function generateId() {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Baca semua akun dari localStorage.
 * Jika belum ada data, return array kosong.
 * @returns {Array} Daftar akun
 */
export function getAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read accounts from localStorage:', e);
    return [];
  }
}

/**
 * Simpan array akun ke localStorage.
 * Setelah simpan, notify semua listener bahwa data berubah.
 * @param {Array} accounts - Daftar akun yang akan disimpan
 */
function saveAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    notifyListeners(accounts);
  } catch (e) {
    console.error('Failed to save accounts to localStorage:', e);
  }
}

/**
 * Tambah akun baru.
 * @param {Object} data - { name, status, refreshDays, refreshHours }
 * @returns {Object} Akun yang baru dibuat (dengan id dan createdAt)
 */
export function addAccount({ name, status, refreshDays, refreshHours }) {
  const accounts = getAccounts();
  const newAccount = {
    id: generateId(),
    name,
    status: status || 'available',
    refreshDays: refreshDays ?? null,
    refreshHours: refreshHours ?? null,
    createdAt: new Date().toISOString(),
  };
  accounts.push(newAccount);
  saveAccounts(accounts);
  return newAccount;
}

/**
 * Edit akun yang sudah ada berdasarkan ID.
 * @param {string} id - ID akun yang akan diedit
 * @param {Object} updates - Field yang akan diupdate { name?, status?, limitTime? }
 * @returns {Object|null} Akun yang sudah diupdate, atau null jika tidak ditemukan
 */
export function editAccount(id, updates) {
  const accounts = getAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return null;

  accounts[index] = { ...accounts[index], ...updates };
  saveAccounts(accounts);
  return accounts[index];
}

/**
 * Hapus akun berdasarkan ID.
 * @param {string} id - ID akun yang akan dihapus
 * @returns {boolean} true jika berhasil dihapus
 */
export function removeAccount(id) {
  let accounts = getAccounts();
  const lengthBefore = accounts.length;
  accounts = accounts.filter((a) => a.id !== id);

  if (accounts.length < lengthBefore) {
    saveAccounts(accounts);
    return true;
  }
  return false;
}

/**
 * Cari satu akun berdasarkan ID.
 * @param {string} id 
 * @returns {Object|undefined}
 */
export function getAccountById(id) {
  return getAccounts().find((a) => a.id === id);
}

/**
 * Hitung statistik ringkasan.
 * @returns {{ total: number, available: number, limited: number }}
 */
export function getStats() {
  const accounts = getAccounts();
  return {
    total: accounts.length,
    available: accounts.filter((a) => a.status === 'available').length,
    limited: accounts.filter((a) => a.status === 'limited').length,
  };
}

/**
 * Register listener yang akan dipanggil setiap kali data berubah.
 * @param {Function} fn - Callback function(accounts)
 */
export function onChange(fn) {
  listeners.push(fn);
}

/**
 * Panggil semua listener.
 * @param {Array} accounts 
 */
function notifyListeners(accounts) {
  listeners.forEach((fn) => fn(accounts));
}
