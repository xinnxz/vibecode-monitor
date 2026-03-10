/**
 * accounts.js — Account Data Management Module (Supabase)
 * 
 * Mengelola data akun menggunakan Supabase PostgreSQL database.
 * Menyediakan async CRUD operations dan event system untuk notify komponen lain.
 * 
 * Menggunakan local cache agar UI tetap responsive:
 * - Data di-fetch dari Supabase saat init (fetchAccounts)
 * - Setiap mutasi (add/edit/delete) langsung update ke Supabase DAN local cache
 * - Stats dihitung dari local cache (sync, instant)
 * 
 * Data Model (Supabase table "accounts"):
 * {
 *   id: UUID (auto-generated),
 *   name: text,
 *   status: "available" | "limited",
 *   refresh_days: integer | null,
 *   refresh_hours: integer | null,
 *   created_at: timestamptz (auto-generated)
 * }
 * 
 * Note: Supabase column names pakai snake_case, tapi di JS kita convert ke camelCase.
 */

import { supabase } from './supabase.js';
import { logHistory } from './history.js';

/**
 * Local cache — mirror data dari Supabase agar getStats() tetap synchronous.
 * Di-update setiap kali ada mutasi atau fetch.
 */
let cachedAccounts = [];

/** 
 * Listeners yang akan dipanggil setiap kali data berubah.
 * Pattern: Observer/Pub-Sub sederhana agar globe & UI bisa react ke perubahan data.
 */
const listeners = [];

/**
 * Convert row dari Supabase (snake_case) ke format JS (camelCase).
 * Ini penting karena PostgreSQL convention pakai underscore,
 * tapi JavaScript convention pakai camelCase.
 * 
 * @param {Object} row - Row dari Supabase
 * @returns {Object} Account object dalam format JS
 */
function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    refreshDays: row.refresh_days,
    refreshHours: row.refresh_hours,
    refreshMinutes: row.refresh_minutes ?? null,
    refreshDeadline: row.refresh_deadline ?? null,
    tags: row.tags || [],
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

/**
 * Convert dari format JS (camelCase) ke Supabase (snake_case).
 * Hanya convert field yang ada (partial update support).
 * 
 * Jika refreshDays/refreshHours/refreshMinutes diberikan, otomatis hitung refresh_deadline.
 * refresh_deadline = now + (days * 86400000) + (hours * 3600000) + (minutes * 60000)
 * 
 * @param {Object} data - Account data dalam format JS
 * @returns {Object} Data dalam format Supabase
 */
function toDb(data) {
  const row = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.status !== undefined) row.status = data.status;
  if (data.refreshDays !== undefined) row.refresh_days = data.refreshDays;
  if (data.refreshHours !== undefined) row.refresh_hours = data.refreshHours;
  if (data.refreshMinutes !== undefined) row.refresh_minutes = data.refreshMinutes;
  if (data.tags !== undefined) row.tags = data.tags;
  if (data.notes !== undefined) row.notes = data.notes;

  // Hitung deadline dari days + hours + minutes jika tersedia
  const days = data.refreshDays ?? 0;
  const hours = data.refreshHours ?? 0;
  const minutes = data.refreshMinutes ?? 0;
  if (days > 0 || hours > 0 || minutes > 0) {
    const ms = (days * 86400000) + (hours * 3600000) + (minutes * 60000);
    row.refresh_deadline = new Date(Date.now() + ms).toISOString();
  } else if (data.refreshDays !== undefined || data.refreshHours !== undefined || data.refreshMinutes !== undefined) {
    row.refresh_deadline = null;
  }

  return row;
}

/**
 * Fetch semua akun dari Supabase.
 * Dipanggil saat app init untuk populate local cache.
 * 
 * @returns {Promise<Array>} Daftar akun
 */
export async function fetchAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Supabase fetch error:', error.message);
    return cachedAccounts; // Return cache jika gagal
  }

  cachedAccounts = data.map(fromDb);

  // Setup Realtime Sync
  setupRealtimeSync();

  return cachedAccounts;
}

/**
 * Supabase Realtime Channel
 * Menerima update dari database secara instan (berguna untuk multi-device/multi-tab syncing).
 */
function setupRealtimeSync() {
  supabase.channel('public:accounts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (payload) => {
      handleRealtimeUpdate(payload);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('🔗 Realtime sync active');
      }
    });
}

function handleRealtimeUpdate(payload) {
  const { eventType, new: newRow, old: oldRow } = payload;
  
  if (eventType === 'INSERT') {
    // Hindari duplikat dari mutasi local
    if (!cachedAccounts.find((a) => a.id === newRow.id)) {
      cachedAccounts.push(fromDb(newRow));
      notifyListeners(cachedAccounts);
    }
  } else if (eventType === 'UPDATE') {
    const index = cachedAccounts.findIndex((a) => a.id === newRow.id);
    if (index !== -1) {
      // Update data cache dengan row terbaru dari server
      cachedAccounts[index] = fromDb(newRow);
      notifyListeners(cachedAccounts);
    }
  } else if (eventType === 'DELETE') {
    const index = cachedAccounts.findIndex((a) => a.id === oldRow.id);
    if (index !== -1) {
      cachedAccounts.splice(index, 1);
      notifyListeners(cachedAccounts);
    }
  }
}

/**
 * Get cached accounts (synchronous).
 * Dipakai untuk getStats() dan rendering yang butuh data instant.
 * 
 * @returns {Array} Daftar akun dari cache
 */
export function getAccounts() {
  return cachedAccounts;
}

/**
 * Tambah akun baru ke Supabase.
 * 
 * @param {Object} data - { name, status, refreshDays, refreshHours, refreshMinutes }
 * @returns {Promise<Object|null>} Akun yang baru dibuat
 */
export async function addAccount({ name, status, refreshDays, refreshHours, refreshMinutes, tags, notes }) {
  const { data, error } = await supabase
    .from('accounts')
    .insert(toDb({ name, status: status || 'available', refreshDays, refreshHours, refreshMinutes, tags, notes }))
    .select()   // Return inserted row
    .single();  // Expect exactly 1 row

  if (error) {
    console.error('❌ Supabase insert error:', error.message);
    return null;
  }

  const newAccount = fromDb(data);
  cachedAccounts.push(newAccount);
  notifyListeners(cachedAccounts);
  logHistory(newAccount.id, 'ACCOUNT_CREATED', null, newAccount.status);
  return newAccount;
}

/**
 * Edit akun yang sudah ada berdasarkan ID.
 * 
 * @param {string} id - UUID akun
 * @param {Object} updates - { name?, status?, refreshDays?, refreshHours? }
 * @returns {Promise<Object|null>} Akun yang sudah diupdate
 */
export async function editAccount(id, updates) {
  const { data, error } = await supabase
    .from('accounts')
    .update(toDb(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase update error:', error.message);
    return null;
  }

  const updated = fromDb(data);
  const index = cachedAccounts.findIndex((a) => a.id === id);
  const oldStatus = index !== -1 ? cachedAccounts[index].status : null;
  
  if (index !== -1) cachedAccounts[index] = updated;
  notifyListeners(cachedAccounts);
  
  if (updates.status && oldStatus && updates.status !== oldStatus) {
    logHistory(id, 'STATUS_CHANGED', oldStatus, updates.status);
  } else {
    logHistory(id, 'ACCOUNT_UPDATED', oldStatus, updated.status);
  }
  
  return updated;
}

/**
 * Hapus akun berdasarkan ID.
 * 
 * @param {string} id - UUID akun
 * @returns {Promise<boolean>} true jika berhasil dihapus
 */
export async function removeAccount(id) {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Supabase delete error:', error.message);
    return false;
  }

  // Update local cache
  const account = cachedAccounts.find((a) => a.id === id);
  const oldStatus = account ? account.status : null;
  cachedAccounts = cachedAccounts.filter((a) => a.id !== id);
  notifyListeners(cachedAccounts);
  logHistory(id, 'ACCOUNT_DELETED', oldStatus, 'deleted');
  return true;
}

/**
 * Hitung statistik ringkasan dari local cache (synchronous).
 * 
 * @returns {{ total: number, available: number, limited: number }}
 */
export function getStats() {
  return {
    total: cachedAccounts.length,
    available: cachedAccounts.filter((a) => a.status === 'available').length,
    limited: cachedAccounts.filter((a) => a.status === 'limited').length,
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
