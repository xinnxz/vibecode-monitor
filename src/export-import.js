import { getAccounts, addAccount } from './accounts.js';
import { addLog } from './activity-log.js';
import { playConfirm, playDelete } from './sounds.js';

/**
 * Export semua data akun sebagai file JSON dan trigger download.
 */
export function downloadBackup() {
  const accounts = getAccounts();
  const dataStr = JSON.stringify(accounts, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibecode_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  addLog('SYSTEM', 'Database exported to JSON');
  playConfirm();
}

/**
 * Handle proses import file JSON dari event input file.
 * 
 * @param {Event} e - event change dari input type=file
 */
export async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid format: expected array');
      
      let imported = 0;
      for (const acc of data) {
        // Hanya proses entry yang valid (minimal ada nama)
        if (acc.name) {
          // Buat sebagai akun baru (ID auto-generated oleh Supabase)
          // untuk menghindari conflict UUID jika ID sudah lama ada
          await addAccount({
            name: acc.name,
            status: acc.status || 'available',
            refreshDays: acc.refreshDays,
            refreshHours: acc.refreshHours,
            refreshMinutes: acc.refreshMinutes,
            tags: acc.tags || [],
            notes: acc.notes || ''
          });
          imported++;
        }
      }
      
      addLog('SYSTEM', `Imported ${imported} accounts from backup`);
      playConfirm();
      alert(`Successfully imported ${imported} accounts!\\n(Added as new entries to avoid conflict)`);
      
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import backup. Invalid JSON format.');
      addLog('SYSTEM', 'Import failed (invalid file)');
      playDelete(); // give error sound
    } finally {
      // Reset input agar file yang sama bisa di-pilih lagi
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}
