/**
 * main.js — Entry Point (Simplified)
 * 
 * File ini adalah titik masuk utama aplikasi.
 * Versi simpel tanpa 3D Globe, Boot Screen, dan Matrix Rain.
 * 
 * Flow:
 * Halaman langsung load → data ditampilkan → siap digunakan
 */

import './style.css';
import { initUI, openModal, openSettingsModal } from './ui.js';
import { requestPermission, initNotifications, clearNotifications } from './notifications.js';
import { initActivityLog } from './activity-log.js';
import { toggleSound } from './sounds.js';
import { downloadBackup, handleImport } from './export-import.js';
import { toggleAmbient } from './ambient-music.js';
import { initCommandPalette } from './command-palette.js';

// --- Inisialisasi Aplikasi ---
async function boot() {
  // 1. Request notification permission + init notification center
  requestPermission();
  initNotifications();

  // 2. Init UI (async: fetch data dari Supabase)
  //    Tidak ada lagi globe callback — kita pass null/noop
  await initUI(() => {}, () => {});

  // 3. Init Activity Log
  initActivityLog();

  // 4. Init Command Palette (Ctrl+K)
  initCommandPalette({
    editAccount: (id) => openModal(id),
    openAddModal: () => openModal(),
    clearNotifications: () => clearNotifications(),
    openSettings: () => openSettingsModal(),
  });

  // 5. Sound toggle button
  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const enabled = toggleSound();
      soundBtn.classList.toggle('muted', !enabled);
    });
  }

  // 6. Music toggle button
  const musicBtn = document.getElementById('btn-music-toggle');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      const playing = toggleAmbient();
      musicBtn.classList.toggle('active', playing);
    });
  }

  // 7. Init Export/Import backup
  const btnExport = document.getElementById('btn-export');
  if (btnExport) btnExport.addEventListener('click', downloadBackup);

  const inputImport = document.getElementById('input-import');
  if (inputImport) inputImport.addEventListener('change', handleImport);

  console.log('📊 Vibe Code Monitor initialized (simplified)');
}

boot().catch((err) => {
  console.error('❌ Failed to initialize app:', err);
});
