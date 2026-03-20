import { supabase } from './supabase.js';

/**
 * Mencatat perubahan pada status atau entitas akun ke Supabase.
 * Jika tabel `account_history` belum ada, akan di-ignore secara graceful.
 * 
 * @param {string} accountId - UUID of the account
 * @param {string} event - Event type (e.g., 'CREATED', 'STATUS_CHANGED', 'REFRESHED')
 * @param {string} oldStatus - Status sebelum perubahan (optional)
 * @param {string} newStatus - Status setelah perubahan (optional)
 */
export async function logHistory(accountId, event, oldStatus = null, newStatus = null) {
  if (!accountId || accountId.includes('temp-')) return; // Skip temporary local objects

  try {
    const { error } = await supabase.from('account_history').insert({
      account_id: accountId,
      event,
      old_status: oldStatus,
      new_status: newStatus
    });
    
    // Ignore error deliberately if it's relation "account_history" does not exist 
    // because user hasn't created the table yet.
    if (error && !error.message.includes('does not exist')) {
      console.warn('History log failed:', error.message);
    }
  } catch (err) {
    // Fail semi-silently to not break the app
  }
}

/**
 * Mengambil riwayat histori dari satu akun.
 * 
 * @param {string} accountId - UUID of the account
 * @returns {Promise<Array>} List of history entries
 */
export async function getHistory(accountId) {
  try {
    const { data, error } = await supabase
      .from('account_history')
      .select('*')
      .eq('account_id', accountId)
      .order('timestamp', { ascending: false })
      .limit(50);
      
    if (error) {
      if (error.message.includes('does not exist')) return [];
      throw error;
    }
    return data || [];
  } catch (err) {
    console.warn('Failed to fetch history:', err.message);
    return [];
  }
}
